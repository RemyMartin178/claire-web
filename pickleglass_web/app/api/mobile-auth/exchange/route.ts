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
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'session_id is required.' },
        { status: 400 }
      );
    }

    console.log('[Exchange] Retrieving session:', session_id);

    // Get the stored session from Firestore
    const sessionDoc = await admin.firestore().collection('pending_sessions').doc(session_id).get();

    if (!sessionDoc.exists) {
      console.error('[Exchange] Session not found:', session_id);
      return NextResponse.json(
        { success: false, error: 'Session not found or expired.' },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session data not found.' },
        { status: 404 }
      );
    }

    // Check if already used
    if (sessionData.used) {
      console.error('[Exchange] Session already used:', session_id);
      return NextResponse.json(
        { success: false, error: 'Session already used.' },
        { status: 409 }
      );
    }

    // Check if expired
    if (sessionData.expires_at.toDate() < new Date()) {
      console.error('[Exchange] Session expired:', session_id);
      await admin.firestore().collection('pending_sessions').doc(session_id).delete();
      return NextResponse.json(
        { success: false, error: 'Session expired.' },
        { status: 410 }
      );
    }

    // Mark as used
    await admin.firestore().collection('pending_sessions').doc(session_id).update({
      used: true,
      used_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[Exchange] Successfully exchanged session:', session_id);

    return NextResponse.json({
      success: true,
      custom_token: sessionData.custom_token,
    });
  } catch (error) {
    console.error('[Exchange] Exchange failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
