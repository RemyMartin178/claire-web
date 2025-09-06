import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

const SECRET = process.env.MOBILE_AUTH_SECRET!;

async function validProof(state: string, proof: string): Promise<boolean> {
  try {
    const mac = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(state)
    );
    const expect = Buffer.from(mac).toString('hex');
    return expect === proof;
  } catch (error) {
    console.error('[mobile-auth] Proof validation error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session_id, state, proof } = await req.json();
    
    if (!session_id || !state || !proof) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    if (!await validProof(state, proof)) {
      console.log('[mobile-auth] Invalid proof for session:', session_id);
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const key = `sess:${session_id}`;
    const rec: any = await kv.get(key);
    
    if (!rec) {
      console.log('[mobile-auth] Session not found:', session_id);
      return NextResponse.json({ error: 'gone' }, { status: 410 });
    }
    
    if (rec.used) {
      console.log('[mobile-auth] Session already used:', session_id);
      return NextResponse.json({ error: 'used' }, { status: 409 });
    }
    
    if (rec.exp < Date.now()) {
      await kv.del(key);
      console.log('[mobile-auth] Session expired:', session_id);
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }

    // Mark as used atomically
    await kv.multi().hset(key, { used: true }).expire(key, 10).exec();
    
    console.log('[mobile-auth] Exchange successful for session:', session_id, 'uid:', rec.uid);
    
    return NextResponse.json({ custom_token: rec.custom_token });
  } catch (error) {
    console.error('[mobile-auth] Exchange error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
