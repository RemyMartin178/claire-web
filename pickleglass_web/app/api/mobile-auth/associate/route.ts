import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../utils/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { session_id } = body;
    
    // Récupérer le token d'autorisation
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'missing_auth_token' }, { status: 401 });
    }
    
    const idToken = authHeader.substring(7);
    
    if (!session_id) {
      return NextResponse.json({ success: false, error: 'session_id required' }, { status: 400 });
    }

    console.log('[mobile-auth/associate] Processing session:', session_id);

    // Vérifier le token et récupérer l'UID
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    console.log('[mobile-auth/associate] Verified user:', uid, decodedToken.email);

    // Créer un custom token
    const customToken = await auth.createCustomToken(uid);
    
    // Stocker dans Firestore
    const db = getFirestore();
    await db.collection('pending_sessions').doc(session_id).set({
      uid: uid,
      custom_token: customToken,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 120000), // 2 minutes
      used: false
    });

    console.log('[mobile-auth/associate] Custom token stored for session:', session_id);

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[mobile-auth/associate] Error:', error);
    return NextResponse.json({ success: false, error: 'internal_server_error' }, { status: 500 });
  }
}
