import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, checkRateLimit } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TOKEN_TTL_SECONDS = 3600

export async function GET(request: NextRequest) {
  const user = await verifyFirebaseToken(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 10 tokens/min max par utilisateur (chaque session en prend 1)
  if (!checkRateLimit(`assemblyai:${user.uid}`, 10)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AssemblyAI not configured' }, { status: 500 })
  }

  const res = await fetch('https://api.assemblyai.com/v3/realtime/token', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expires_in: TOKEN_TTL_SECONDS }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[token/assemblyai] AssemblyAI error:', err)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 502 })
  }

  const { token } = await res.json()
  return NextResponse.json({ token, expires_in: TOKEN_TTL_SECONDS })
}
