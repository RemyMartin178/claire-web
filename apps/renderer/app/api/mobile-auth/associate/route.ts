import { NextRequest, NextResponse } from 'next/server'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const adminAuth = ensureFirebaseAdminInitialized()
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 })
    }

    const body = await request.json()
    const idToken: string | undefined = body?.idToken || body?.token

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch {
      return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 })
    }

    const customToken = await adminAuth.createCustomToken(decodedToken.uid)
    return NextResponse.json({ customToken })
  } catch (error: any) {
    console.error('[mobile-auth/associate] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
