import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

// Use Firebase Firestore in production, SQLite in dev
const useFirestore = process.env.NODE_ENV === 'production' || process.env.USE_FIRESTORE === 'true';

// SQLite imports (only for dev)
let sqlite3: any, path: any;
if (!useFirestore) {
  sqlite3 = require('sqlite3');
  path = require('path');
}

// Firebase imports
const { initFirebaseAdmin } = require('../../../../backend_node/firebaseAdmin');

// Interface pour typer les résultats SQLite
interface PendingSession {
  session_id: string;
  state: string;
  code_challenge: string;
  code_verifier_hash: string;
  created_at: number;
  expires_at: number;
  used_at?: number;
  uid?: string;
  id_token?: string;
  refresh_token?: string;
}

// Fonction pour obtenir le chemin de la base de données
function getDbPath() {
  if (process.env.PENDING_SESSIONS_DB_PATH) {
    return process.env.PENDING_SESSIONS_DB_PATH;
  }
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), '..', 'pending_sessions.sqlite');
  }
  // En production, on utilise une base de données temporaire
  return path.join(process.cwd(), 'pending_sessions.sqlite');
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    console.log('[exchange] Received request:', { hasIdToken: !!body?.id_token, hasRefreshToken: !!body?.refresh_token });
    
    // Accept both `session_id` and `code` for compatibility with desktop
    const session_id: string | undefined = body?.session_id || body?.code;
    const providedIdToken: string | undefined = body?.id_token || body?.idToken;
    const providedRefreshToken: string | undefined = body?.refresh_token || body?.refreshToken;

    console.log(`[API Exchange] Processing request - session_id: ${session_id}, has_id_token: ${!!providedIdToken}, using Firestore: ${useFirestore}`);

    // PLAN A: If session_id not provided but id_token is, directly create a custom token from id_token
    // This makes the endpoint idempotent and supports the desktop's direct call flow.
    if (!session_id && providedIdToken) {
      try {
        console.log('[API Exchange] Direct id_token flow: creating custom token from provided id_token');
        const admin = initFirebaseAdmin();
        const decoded = await admin.auth().verifyIdToken(providedIdToken);
        const uid = decoded?.uid;
        if (!uid) {
          return NextResponse.json(
            { success: false, error: 'invalid_id_token' },
            { status: 400 }
          );
        }
        const forcedCustom = await admin.auth().createCustomToken(uid, { src: 'mobile-exchange' });
        console.log(`[API Exchange] Successfully created custom token for uid: ${uid}`);
        
        return NextResponse.json({
          success: true,
          // snake_case to match desktop expectations
          id_token: providedIdToken,
          refresh_token: providedRefreshToken,
          custom_token: forcedCustom,
        });
      } catch (e: any) {
        console.error('[API Exchange] Failed to coerce custom token from provided id_token:', e?.message);
        return NextResponse.json(
          { success: false, error: 'coercion_failed' },
          { status: 500 }
        );
      }
    }

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'missing_session_id' },
        { status: 400 }
      );
    }

    const now = Date.now();

    if (useFirestore) {
      // Production: Use Firestore
      try {
        const admin = initFirebaseAdmin();
        const db = admin.firestore();
        const docRef = db.collection('pending_sessions').doc(session_id);
        
        // Check if session exists and is valid
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          return NextResponse.json(
            { success: false, error: 'invalid_or_expired_session' },
            { status: 404 }
          );
        }

        const data = docSnap.data();
        if (!data || data.expires_at < now || data.used) {
          return NextResponse.json(
            { success: false, error: 'invalid_or_expired_session' },
            { status: 404 }
          );
        }

        if (!data.id_token || !data.refresh_token) {
          return NextResponse.json(
            { success: false, error: 'tokens_not_associated' },
            { status: 400 }
          );
        }

        // Mark session as used
        await docRef.update({
          used: true,
          used_at: now,
        });

        // Generate custom token
        let customToken: string | undefined;
        try {
          let uid = data.uid;
          if (!uid && data.id_token) {
            const decoded = await admin.auth().verifyIdToken(data.id_token);
            uid = decoded?.uid;
          }
          if (uid) {
            customToken = await admin.auth().createCustomToken(uid, { src: 'mobile-exchange' });
          }
        } catch (e: any) {
          console.error('[API Exchange] Firestore: Failed to generate custom token:', e?.message);
        }

        console.log(`[API Exchange] Firestore: Tokens échangés avec succès pour la session: ${session_id}`);
        return NextResponse.json({
          success: true,
          // snake_case keys expected by desktop
          id_token: data.id_token,
          refresh_token: data.refresh_token,
          custom_token: customToken,
        });

      } catch (error: any) {
        console.error('[API Exchange] Firestore error:', error?.message);
        return NextResponse.json(
          { success: false, error: 'internal_server_error' },
          { status: 500 }
        );
      }
    } else {
      // Development: Use SQLite
      const dbPath = getDbPath();
      const db = new sqlite3.Database(dbPath);

      return new Promise<Response>((resolve) => {
        // Vérifier si la session existe et n'est pas expirée
        const checkStmt = db.prepare(`
          SELECT * FROM pending_sessions 
          WHERE session_id = ? AND expires_at > ? AND used = 0
        `);

        checkStmt.get([session_id, now], (err: any, row: PendingSession | undefined) => {
          if (err) {
            console.error('[API Exchange] SQLite error:', err);
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

          updateStmt.run([now, session_id], function(updateErr: any) {
            if (updateErr) {
              console.error('[API Exchange] SQLite update error:', updateErr);
              resolve(NextResponse.json(
                { success: false, error: 'internal_server_error' },
                { status: 500 }
              ));
              return;
            }

            console.log(`[API Exchange] SQLite: Tokens échangés avec succès pour la session: ${session_id}`);
            // Try to produce a Firebase custom token from uid or id_token
            (async () => {
              let customToken: string | undefined;
              try {
                const admin = initFirebaseAdmin();
                let uid = (row as any).uid as string | undefined;
                if (!uid && row.id_token) {
                  const decoded = await admin.auth().verifyIdToken(row.id_token);
                  uid = decoded?.uid;
                }
                if (uid) {
                  customToken = await admin.auth().createCustomToken(uid, { src: 'mobile-exchange' });
                }
              } catch (e: any) {
                console.error('[API Exchange] SQLite: Failed to generate custom token:', e?.message);
              }

              resolve(NextResponse.json({
                success: true,
                // snake_case keys expected by desktop
                id_token: row.id_token,
                refresh_token: row.refresh_token,
                custom_token: customToken,
              }));
            })();

            updateStmt.finalize();
          });
        });

        checkStmt.finalize();
      });
    }

  } catch (error) {
    console.error('[API Exchange] Erreur lors de l\'échange de tokens:', error);
    return NextResponse.json(
      { success: false, error: 'internal_server_error' },
      { status: 500 }
    );
  }
}
