import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import path from 'path';

// Fonction pour obtenir le chemin de la base de données
function getDbPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), '..', 'pending_sessions.sqlite');
  }
  // En production, on utilise une base de données temporaire
  return path.join(process.cwd(), 'pending_sessions.sqlite');
}

// Fonction pour créer une table SQLite si elle n'existe pas
function ensureTableExists(db: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS pending_sessions (
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
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Ajouter les colonnes manquantes si elles n'existent pas
        db.run('ALTER TABLE pending_sessions ADD COLUMN uid TEXT', () => {});
        db.run('ALTER TABLE pending_sessions ADD COLUMN id_token TEXT', () => {});
        db.run('ALTER TABLE pending_sessions ADD COLUMN refresh_token TEXT', () => {});
        resolve();
      }
    });
  });
}

function sha256Base64Url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    // Ouvrir la base de données
    const dbPath = getDbPath();
    const db = new sqlite3.Database(dbPath);
    
    // S'assurer que la table existe
    await ensureTableExists(db);

    // Nettoyer les sessions expirées
    const now = Date.now();
    db.run('DELETE FROM pending_sessions WHERE expires_at < ? OR used_at IS NOT NULL', [now]);

    // Générer les données de session
    const session_id = crypto.randomUUID();
    const state = crypto.randomBytes(16).toString('hex');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = sha256Base64Url(code_verifier);
    const code_verifier_hash = sha256Base64Url(code_verifier);
    const created_at = now;
    const expires_at = created_at + (2 * 60 * 1000); // 2 minutes TTL

    return new Promise((resolve) => {
      // Insérer la session
      const stmt = db.prepare(`
        INSERT INTO pending_sessions(session_id, state, code_challenge, code_verifier_hash, created_at, expires_at)
        VALUES(?,?,?,?,?,?)
      `);

      stmt.run([session_id, state, code_challenge, code_verifier_hash, created_at, expires_at], function(err) {
        if (err) {
          console.error('[API] Erreur lors de la création de session:', err);
          resolve(NextResponse.json(
            { success: false, error: 'failed_to_create_pending_session' },
            { status: 500 }
          ));
          return;
        }

        console.log(`[API] Session créée avec succès: ${session_id}`);
        resolve(NextResponse.json({ 
          success: true, 
          session_id, 
          state, 
          code_challenge, 
          code_verifier 
        }));

        stmt.finalize();
      });
    });

  } catch (error) {
    console.error('[API] Erreur lors de la création de session:', error);
    return NextResponse.json(
      { success: false, error: 'internal_server_error' },
      { status: 500 }
    );
  }
}
