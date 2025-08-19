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
    if (!session_id || !id_token || !refresh_token) {
      return res.status(400).json({ success: false, error: 'invalid_request' });
    }

    const row = db.prepare('SELECT * FROM pending_sessions WHERE session_id = ?').get(session_id);
    if (!row) return res.status(400).json({ success: false, error: 'unknown_session' });
    if (row.used_at) return res.status(400).json({ success: false, error: 'session_already_used' });
    if (row.expires_at < nowMs()) return res.status(400).json({ success: false, error: 'session_expired' });

    const admin = initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(id_token, true);
    const uid = decoded.uid;

    // Bind tokens to session (one-time)
    db.prepare('UPDATE pending_sessions SET uid=?, id_token=?, refresh_token=? WHERE session_id = ?')
      .run(uid, id_token, refresh_token, session_id);

    return res.json({ success: true, state: row.state });
  } catch (error) {
    console.error('[Auth] /associate error', error);
    res.status(500).json({ success: false, error: 'associate_failed' });
  }
});

// POST /auth/exchange
// SECURITY: Validates state + PKCE, TTL/one-time; returns Firebase tokens (reuse existing infra)
router.post('/exchange', async (req, res) => {
  try {
    const { code, state, code_verifier } = req.body || {};
    if (!code || !state || !code_verifier) {
      return res.status(400).json({ success: false, error: 'invalid_request' });
    }

    const row = db.prepare('SELECT * FROM pending_sessions WHERE session_id = ?').get(code);
    if (!row) return res.status(400).json({ success: false, error: 'unknown_session' });
    if (row.used_at) return res.status(400).json({ success: false, error: 'session_already_used' });
    if (row.expires_at < nowMs()) return res.status(400).json({ success: false, error: 'session_expired' });
    if (row.state !== state) return res.status(400).json({ success: false, error: 'state_mismatch' });

    const verifierHash = sha256Base64Url(code_verifier);
    if (verifierHash !== row.code_verifier_hash) {
      return res.status(400).json({ success: false, error: 'pkce_verifier_mismatch' });
    }

    // At this point, the user should have been associated to this session (via web flow).
    // IPC to main process to retrieve the Firebase user credentials bound to this session.
    let tokens;
    try {
      tokens = await ipcRequest(req, 'mobile-auth-exchange', { session_id: code });
    } catch (e) {
      console.error('[Auth] exchange IPC failed', e);
      return res.status(400).json({ success: false, error: 'exchange_unavailable' });
    }

    if (!tokens || !tokens.idToken || !tokens.refreshToken) {
      return res.status(400).json({ success: false, error: 'tokens_not_ready' });
    }

    db.prepare('UPDATE pending_sessions SET used_at = ? WHERE session_id = ?').run(nowMs(), code);
    return res.json({ success: true, id_token: tokens.idToken, refresh_token: tokens.refreshToken });
  } catch (error) {
    console.error('[Auth] /exchange error', error);
    res.status(500).json({ success: false, error: 'exchange_failed' });
  }
});

// POST /auth/logout
// SECURITY: revoke refresh tokens and clear cookie
router.post('/logout', async (req, res) => {
  try {
    const admin = initFirebaseAdmin();
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ success: false, error: 'missing_uid' });

    await admin.auth().revokeRefreshTokens(uid);
    res.clearCookie('session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] logout error', error);
    res.status(500).json({ success: false, error: 'logout_failed' });
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
