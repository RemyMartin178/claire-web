import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, checkRateLimit } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_KEY = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY

export async function POST(request: NextRequest) {
  const user = await verifyFirebaseToken(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`analytics:${user.uid}`, 120)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  if (!POSTHOG_KEY) {
    return NextResponse.json({ configured: false }, { status: 202 })
  }

  let body: { event?: string; properties?: Record<string, unknown> } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!body.event || typeof body.event !== 'string') {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 })
  }

  const res = await fetch(`${POSTHOG_HOST.replace(/\/+$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: body.event,
      distinct_id: user.uid,
      properties: {
        source: 'claire-api',
        ...(body.properties || {}),
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[analytics/capture] PostHog error:', res.status, detail)
    return NextResponse.json({ error: 'Failed to capture event' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
