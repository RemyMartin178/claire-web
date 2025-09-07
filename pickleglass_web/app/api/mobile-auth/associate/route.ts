import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dedale-database'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, session_id } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ID token is required.' },
        { status: 400 }
      );
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    console.log('[Associate] Verified token for UID:', uid);

    const customToken = await admin.auth().createCustomToken(uid);

    // If sessionId is provided, store the custom token for later retrieval
    if (session_id) {
      console.log('[Associate] Storing custom token for session:', session_id);
      await admin.firestore().collection('pending_sessions').doc(session_id)
          .set({
            uid: uid,
            custom_token: customToken,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            expires_at: new Date(Date.now() + 120000), // 2 minutes
            used: false,
          });
      console.log('[Associate] Custom token stored for session:', session_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      },
      customToken,
    });
  } catch (error) {
    console.error('[Associate] Authentication failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid token or authentication failed.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 401 }
    );
  }
}
