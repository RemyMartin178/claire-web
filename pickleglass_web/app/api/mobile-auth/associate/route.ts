import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/firebaseAdmin';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { uid } = await auth.verifyIdToken(idToken);
    console.log('[mobile-auth] Creating custom token for uid:', uid, 'session:', session_id);

    const custom_token = await auth.createCustomToken(uid, { sid: session_id });
    
    const ua = req.headers.get('user-agent') || 'n/a';
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || '0';
    const iphash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    
    const sessionData = {
      uid,
      custom_token,
      used: false,
      ua,
      iphash: Buffer.from(iphash).toString('hex'),
      exp: Date.now() + 120000, // 2 minutes
      created_at: Date.now()
    };

    await kv.set(`sess:${session_id}`, sessionData, { ex: 180 }); // TTL 3 minutes
    
    console.log('[mobile-auth] Session stored successfully:', session_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile-auth] Associate error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
