import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../utils/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { session_id, uid } = body;
    
    if (!session_id || !uid) {
      return NextResponse.json({ success: false, error: 'session_id and uid required' }, { status: 400 });
    }

    console.log('[store-token] Storing custom token for session:', session_id, 'uid:', uid);

    const customToken = await auth.createCustomToken(uid);
    
    const db = getFirestore();
    await db.collection('pending_sessions').doc(session_id).set({
      uid: uid,
      custom_token: customToken,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 120000), // 2 minutes
      used: false
    });

    console.log('[store-token] Custom token stored successfully for session:', session_id);

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[store-token] Error:', error);
    return NextResponse.json({ success: false, error: 'internal_server_error' }, { status: 500 });
  }
}
