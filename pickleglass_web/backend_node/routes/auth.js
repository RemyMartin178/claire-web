const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();
const { ipcRequest } = require('../ipcBridge');
const path = require('node:path');
const Database = require('better-sqlite3');
const { initFirebaseAdmin } = require('../firebaseAdmin');

// SQLite: pending sessions store (TTL + one-time use)
const dbPath = path.join(process.cwd(), 'pending_sessions.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS pending_sessions (
  session_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_verifier_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  uid TEXT,
  id_token TEXT,
  refresh_token TEXT
)`);

// Attempt to add missing columns if the table pre-existed without them
try { db.exec('ALTER TABLE pending_sessions ADD COLUMN uid TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE pending_sessions ADD COLUMN id_token TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE pending_sessions ADD COLUMN refresh_token TEXT'); } catch (_) {}

const nowMs = () => Date.now();
const ttlMs = 2 * 60 * 1000; // 2 minutes

function sha256Base64Url(input) {
  const hash = crypto.createHash('sha256').update(input).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Cleanup old/used sessions opportunistically
const cleanupStmt = db.prepare('DELETE FROM pending_sessions WHERE expires_at < ? OR used_at IS NOT NULL');

// Fonction de nettoyage améliorée
function cleanupExpiredSessions() {
    try {
        const deletedCount = cleanupStmt.run(nowMs());
        if (deletedCount.changes > 0) {
            console.log(`[Auth] Cleaned up ${deletedCount.changes} expired/used sessions`);
        }
    } catch (error) {
        console.error('[Auth] Error during session cleanup:', error);
    }
}

// Nettoyage au démarrage et toutes les 5 minutes
cleanupExpiredSessions();
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// POST /pending-session
// SECURITY: Generates PKCE state/challenge, stores verifier hash, TTL 2 min, one-time
router.post('/pending-session', async (req, res) => {
  try {
    cleanupStmt.run(nowMs());

    const session_id = crypto.randomUUID();
    const state = crypto.randomBytes(16).toString('hex');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = sha256Base64Url(code_verifier);
    const code_verifier_hash = sha256Base64Url(code_verifier);
    const created_at = nowMs();
    const expires_at = created_at + ttlMs;

    db.prepare(`INSERT INTO pending_sessions(session_id, state, code_challenge, code_verifier_hash, created_at, expires_at)
                VALUES(?,?,?,?,?,?)`).run(session_id, state, code_challenge, code_verifier_hash, created_at, expires_at);

    // Return verifier only to desktop app that calls this; not exposed in web flow
    res.json({ success: true, session_id, state, code_challenge, code_verifier });
  } catch (error) {
    console.error('[Auth] /pending-session error', error);
    res.status(500).json({ success: false, error: 'failed_to_create_pending_session' });
  }
});

// POST /auth/associate
// SECURITY: Called by web after successful Firebase login. Verifies ID token, binds tokens to pending session.
router.post('/associate', async (req, res) => {
  try {
    const { session_id, id_token, refresh_token } = req.body || {};
    console.log('[Auth] /associate called with session_id:', session_id ? 'present' : 'missing');
    
    if (!session_id || !id_token || !refresh_token) {
      console.error('[Auth] /associate missing required fields:', { 
        hasSessionId: !!session_id, 
        hasIdToken: !!id_token, 
        hasRefreshToken: !!refresh_token 
      });
      return res.status(400).json({ success: false, error: 'invalid_request' });
    }

    const row = db.prepare('SELECT * FROM pending_sessions WHERE session_id = ?').get(session_id);
    if (!row) {
      console.error('[Auth] /associate unknown session:', session_id);
      return res.status(400).json({ success: false, error: 'unknown_session' });
    }
    if (row.used_at) {
      console.error('[Auth] /associate session already used:', session_id);
      return res.status(400).json({ success: false, error: 'session_already_used' });
    }
    if (row.expires_at < nowMs()) {
      console.error('[Auth] /associate session expired:', session_id, 'expired at:', new Date(row.expires_at));
      return res.status(400).json({ success: false, error: 'session_expired' });
    }

    const admin = initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(id_token, true);
    const uid = decoded.uid;
    console.log('[Auth] /associate verified token for user:', uid);

    // Bind tokens to session (one-time)
    db.prepare('UPDATE pending_sessions SET uid=?, id_token=?, refresh_token=? WHERE session_id = ?')
      .run(uid, id_token, refresh_token, session_id);

    console.log('[Auth] /associate successfully bound tokens to session:', session_id);
    return res.json({ success: true, state: row.state });
  } catch (error) {
    console.error('[Auth] /associate error:', error);
    res.status(500).json({ success: false, error: 'associate_failed' });
  }
});

// POST /auth/exchange
// SECURITY: Validates state + PKCE, TTL/one-time; returns Firebase tokens (reuse existing infra)
router.post('/exchange', async (req, res) => {
  try {
    const { code, state, code_verifier } = req.body || {};
    console.log('[Auth] /exchange called with code:', code ? 'present' : 'missing');
    
    if (!code || !state || !code_verifier) {
      console.error('[Auth] /exchange missing required fields:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasCodeVerifier: !!code_verifier 
      });
      return res.status(400).json({ success: false, error: 'invalid_request' });
    }

    const row = db.prepare('SELECT * FROM pending_sessions WHERE session_id = ?').get(code);
    if (!row) {
      console.error('[Auth] /exchange unknown session:', code);
      return res.status(400).json({ success: false, error: 'unknown_session' });
    }
    if (row.used_at) {
      console.error('[Auth] /exchange session already used:', code);
      return res.status(400).json({ success: false, error: 'session_already_used' });
    }
    if (row.expires_at < nowMs()) {
      console.error('[Auth] /exchange session expired:', code, 'expired at:', new Date(row.expires_at));
      return res.status(400).json({ success: false, error: 'session_expired' });
    }
    if (row.state !== state) {
      console.error('[Auth] /exchange state mismatch:', { expected: row.state, received: state });
      return res.status(400).json({ success: false, error: 'state_mismatch' });
    }

    const verifierHash = sha256Base64Url(code_verifier);
    if (verifierHash !== row.code_verifier_hash) {
      console.error('[Auth] /exchange PKCE verifier mismatch');
      return res.status(400).json({ success: false, error: 'pkce_verifier_mismatch' });
    }

    // At this point, the user should have been associated to this session (via web flow).
    // IPC to main process to retrieve the Firebase user credentials bound to this session.
    let tokens;
    try {
      tokens = await ipcRequest(req, 'mobile-auth-exchange', { session_id: code });
      console.log('[Auth] /exchange IPC call successful');
    } catch (e) {
      console.error('[Auth] /exchange IPC failed:', e);
      return res.status(400).json({ success: false, error: 'exchange_unavailable' });
    }

    if (!tokens || !tokens.idToken || !tokens.refreshToken) {
      console.error('[Auth] /exchange tokens not ready:', { hasTokens: !!tokens, hasIdToken: !!tokens?.idToken, hasRefreshToken: !!tokens?.refreshToken });
      return res.status(400).json({ success: false, error: 'tokens_not_ready' });
    }

    db.prepare('UPDATE pending_sessions SET used_at = ? WHERE session_id = ?').run(nowMs(), code);
    console.log('[Auth] /exchange successfully completed for session:', code);
    return res.json({ success: true, id_token: tokens.idToken, refresh_token: tokens.refreshToken });
  } catch (error) {
    console.error('[Auth] /exchange error:', error);
    res.status(500).json({ success: false, error: 'exchange_failed' });
  }
});

// POST /auth/logout
// SECURITY: revoke refresh tokens and clear cookie
router.post('/logout', async (req, res) => {
  try {
    const { uid, id_token } = req.body || {};
    let finalUid = uid;
    if (!finalUid && id_token && process.env.SKIP_FIREBASE_VERIFY !== '1') {
      const admin = initFirebaseAdmin();
      const decoded = await admin.auth().verifyIdToken(id_token, true);
      finalUid = decoded.uid;
    }
    if (!finalUid && process.env.SKIP_FIREBASE_VERIFY === '1') {
      finalUid = 'test-user';
    }
    if (!finalUid) return res.status(400).json({ success: false, error: 'missing_uid' });

    if (process.env.SKIP_FIREBASE_VERIFY !== '1') {
      const admin = initFirebaseAdmin();
      await admin.auth().revokeRefreshTokens(finalUid);
    }
    res.clearCookie('session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] logout error', error);
    res.status(500).json({ success: false, error: 'logout_failed' });
  }
});

// GET /auth/me - Verify ID token via Firebase Admin and return user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.id_token || req.body?.id_token);
    if (!token && process.env.SKIP_FIREBASE_VERIFY !== '1') {
      return res.status(401).json({ success: false, error: 'missing_token' });
    }
    if (process.env.SKIP_FIREBASE_VERIFY === '1') {
      return res.json({ success: true, uid: 'test-user', email: 'test@example.com' });
    }
    const admin = initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token, true);
    const { uid, email } = decoded;
    return res.json({ success: true, uid, email });
  } catch (error) {
    console.error('[Auth] /me error', error);
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }
});

router.get('/status', async (req, res) => {
    try {
        const user = await ipcRequest(req, 'get-user-profile');
        if (!user) {
            return res.status(500).json({ error: 'Default user not initialized' });
        }
        res.json({ 
            authenticated: true, 
            user: {
                id: user.uid,
                name: user.display_name
            }
        });
    } catch (error) {
        console.error('Failed to get auth status via IPC:', error);
        res.status(500).json({ error: 'Failed to retrieve auth status' });
    }
});

module.exports = router;
