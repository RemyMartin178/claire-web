import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { checkRateLimit } from '@/lib/rateLimit';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const adminConfig: admin.AppOptions = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'dedale-database',
  };

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    adminConfig.credential = admin.credential.cert({
      projectId: adminConfig.projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  admin.initializeApp(adminConfig);
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rl = checkRateLimit(ip, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { ...securityHeaders, 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { session_id } = await request.json();

    if (!session_id || typeof session_id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(session_id)) {
      return NextResponse.json(
        { success: false, error: !session_id ? 'session_id is required.' : 'Invalid session_id format' },
        { status: 400, headers: securityHeaders }
      );
    }

    console.log('[Exchange] Retrieving session:', session_id);

    const sessionDoc = await admin.firestore().collection('pending_sessions').doc(session_id).get();

    if (!sessionDoc.exists) {
      console.error('[Exchange] Session not found:', session_id);
      return NextResponse.json(
        { success: false, error: 'Session not found or expired.' },
        { status: 404, headers: securityHeaders }
      );
    }

    const sessionData = sessionDoc.data();

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session data not found.' },
        { status: 404, headers: securityHeaders }
      );
    }

    if (sessionData.used) {
      console.error('[Exchange] Session already used:', session_id);
      return NextResponse.json(
        { success: false, error: 'Session already used.' },
        { status: 409, headers: securityHeaders }
      );
    }

    if (sessionData.expires_at.toDate() < new Date()) {
      console.error('[Exchange] Session expired:', session_id);
      await admin.firestore().collection('pending_sessions').doc(session_id).delete();
      return NextResponse.json(
        { success: false, error: 'Session expired.' },
        { status: 410, headers: securityHeaders }
      );
    }

    const uid = sessionData.uid;
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'No UID in session.' },
        { status: 400, headers: securityHeaders }
      );
    }

    console.log('[Exchange] Creating custom token for uid:', uid);
    const customToken = await admin.auth().createCustomToken(uid);

    await admin.firestore().collection('pending_sessions').doc(session_id).update({
      used: true,
      used_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('[Exchange] Successfully exchanged session:', session_id);

    return NextResponse.json(
      { success: true, custom_token: customToken },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Exchange] Exchange failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: securityHeaders }
    );
  }
}
