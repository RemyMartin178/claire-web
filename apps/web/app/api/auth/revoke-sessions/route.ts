import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

export async function POST(request: NextRequest) {
  try {
    ensureFirebaseAdminInitialized()

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await getAuth().verifyIdToken(authHeader.split(' ')[1])
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Revoke all refresh tokens for this user — forces re-login on all other devices
    await getAuth().revokeRefreshTokens(decoded.uid)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}
