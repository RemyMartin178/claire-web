import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'missing_session_id' },
        { status: 400 }
      );
    }

    // Ouvrir la base de données
    const dbPath = getDbPath();
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve) => {
      // Vérifier si la session existe et n'est pas expirée
      const now = Date.now();
      const checkStmt = db.prepare(`
        SELECT * FROM pending_sessions 
        WHERE session_id = ? AND expires_at > ? AND used = 0
      `);

      checkStmt.get([session_id, now], (err, row) => {
        if (err) {
          console.error('[API] Erreur lors de la vérification de session:', err);
          resolve(NextResponse.json(
            { success: false, error: 'internal_server_error' },
            { status: 500 }
          ));
          return;
        }

        if (!row) {
          resolve(NextResponse.json(
            { success: false, error: 'invalid_or_expired_session' },
            { status: 404 }
          ));
          return;
        }

        if (!row.id_token || !row.refresh_token) {
          resolve(NextResponse.json(
            { success: false, error: 'tokens_not_associated' },
            { status: 400 }
          ));
          return;
        }

        // Marquer la session comme utilisée
        const updateStmt = db.prepare(`
          UPDATE pending_sessions 
          SET used = 1, used_at = ?
          WHERE session_id = ?
        `);

        updateStmt.run([now, session_id], function(updateErr) {
          if (updateErr) {
            console.error('[API] Erreur lors de la mise à jour:', updateErr);
            resolve(NextResponse.json(
              { success: false, error: 'internal_server_error' },
              { status: 500 }
            ));
            return;
          }

          console.log(`[API] Tokens échangés avec succès pour la session: ${session_id}`);
          resolve(NextResponse.json({ 
            success: true, 
            idToken: row.id_token, 
            refreshToken: row.refresh_token 
          }));

          updateStmt.finalize();
        });
      });

      checkStmt.finalize();
    });

  } catch (error) {
    console.error('[API] Erreur lors de l\'échange de tokens:', error);
    return NextResponse.json(
      { success: false, error: 'internal_server_error' },
      { status: 500 }
    );
  }
}
