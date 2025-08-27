import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

// Fonction pour obtenir le chemin de la base de données
function getDbPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), '..', 'pending_sessions.sqlite');
  }
  // En production, on utilise une base de données temporaire ou on gère différemment
  return path.join(process.cwd(), 'pending_sessions.sqlite');
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, id_token, refresh_token } = await request.json();

    if (!session_id || !id_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Paramètres manquants: session_id, id_token, refresh_token' },
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
            { error: 'Erreur interne du serveur' },
            { status: 500 }
          ));
          return;
        }

        if (!row) {
          resolve(NextResponse.json(
            { error: 'Session invalide ou expirée' },
            { status: 404 }
          ));
          return;
        }

        // Mettre à jour la session avec les tokens
        const updateStmt = db.prepare(`
          UPDATE pending_sessions 
          SET id_token = ?, refresh_token = ?, used = 1, updated_at = ?
          WHERE session_id = ?
        `);

        updateStmt.run([id_token, refresh_token, now, session_id], function(updateErr) {
          if (updateErr) {
            console.error('[API] Erreur lors de la mise à jour:', updateErr);
            resolve(NextResponse.json(
              { error: 'Erreur lors de l\'association des tokens' },
              { status: 500 }
            ));
            return;
          }

          console.log(`[API] Tokens associés avec succès pour la session: ${session_id}`);
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Tokens associés avec succès' 
          }));
        });

        updateStmt.finalize();
      });

      checkStmt.finalize();
    });

  } catch (error) {
    console.error('[API] Erreur lors de l\'association des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
