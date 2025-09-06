import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { session_id } = body;
    
    if (!session_id) {
      return NextResponse.json({ success: false, error: 'session_id required' }, { status: 400 });
    }

    console.log('[mobile-auth/exchange] Processing session:', session_id);

    // Récupérer depuis Firestore
    const db = getFirestore();
    const sessionDoc = await db.collection('pending_sessions').doc(session_id).get();
    
    if (!sessionDoc.exists) {
      console.log('[mobile-auth/exchange] Session not found:', session_id);
      return NextResponse.json({ success: false, error: 'session_not_found' }, { status: 404 });
    }
    
    const sessionData = sessionDoc.data();
    
    if (sessionData?.used) {
      console.log('[mobile-auth/exchange] Session already used:', session_id);
      return NextResponse.json({ success: false, error: 'session_already_used' }, { status: 410 });
    }
    
    if (sessionData?.expires_at && new Date() > sessionData.expires_at.toDate()) {
      console.log('[mobile-auth/exchange] Session expired:', session_id);
      return NextResponse.json({ success: false, error: 'session_expired' }, { status: 410 });
    }
    
    // Marquer comme utilisé
    await db.collection('pending_sessions').doc(session_id).update({
      used: true,
      used_at: new Date()
    });

    console.log('[mobile-auth/exchange] Session exchanged successfully:', session_id);

    return NextResponse.json({ 
      success: true, 
      custom_token: sessionData?.custom_token 
    });
    
  } catch (error) {
    console.error('[mobile-auth/exchange] Error:', error);
    return NextResponse.json({ success: false, error: 'internal_server_error' }, { status: 500 });
  }
}
