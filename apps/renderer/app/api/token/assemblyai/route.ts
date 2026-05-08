import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, checkRateLimit } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TOKEN_TTL_SECONDS = 600

export async function GET(request: NextRequest) {
  const user = await verifyFirebaseToken(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 60 token requests/min — listenService spawns 2 STT sessions (mic + speakers)
  // and retries up to 10 times each on init failure, so 20 requests per attempt
  // is the floor before we even consider real burst usage.
  if (!checkRateLimit(`assemblyai:${user.uid}`, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AssemblyAI not configured' }, { status: 500 })
  }

  // AssemblyAI v3 streaming token — note: v3 uses streaming.assemblyai.com host
  // and a GET with expires_in_seconds query, NOT api.assemblyai.com/v3/realtime/token (that path is 404).
  const url = new URL('https://streaming.assemblyai.com/v3/token')
  url.searchParams.set('expires_in_seconds', String(TOKEN_TTL_SECONDS))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Authorization': apiKey },
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('[token/assemblyai] AssemblyAI error:', res.status, err)
    return NextResponse.json({ error: 'Failed to create token', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  // v3 returns { token: string } — but be defensive in case shape changes
  const token = data?.token ?? data?.streaming_token
  if (!token) {
    console.error('[token/assemblyai] missing token in response', data)
    return NextResponse.json({ error: 'Invalid AssemblyAI response' }, { status: 502 })
  }
  return NextResponse.json({ token, expires_in: TOKEN_TTL_SECONDS })
}
