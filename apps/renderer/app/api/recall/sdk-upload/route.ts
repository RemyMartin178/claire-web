import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, checkRateLimit } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_RECALL_API_URL = 'https://us-west-2.recall.ai'

export async function POST(request: NextRequest) {
  const user = await verifyFirebaseToken(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`recall-sdk-upload:${user.uid}`, 10)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const apiKey = process.env.RECALL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Recall not configured' }, { status: 500 })
  }

  let body: { window?: unknown; metadata?: Record<string, unknown> } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const recallApiUrl = (process.env.RECALL_API_URL || DEFAULT_RECALL_API_URL).replace(/\/+$/, '')
  const res = await fetch(`${recallApiUrl}/api/v1/sdk_upload/`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      metadata: {
        uid: user.uid,
        source: 'claire-electron',
        ...(body.metadata || {}),
        detected_window: body.window || undefined,
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[recall/sdk-upload] Recall error:', res.status, detail)
    return NextResponse.json({ error: 'Failed to create Recall SDK upload', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  const uploadToken = data?.upload_token
  if (!uploadToken) {
    console.error('[recall/sdk-upload] missing upload_token in response', data)
    return NextResponse.json({ error: 'Invalid Recall response' }, { status: 502 })
  }

  return NextResponse.json({
    id: data.id,
    upload_token: uploadToken,
    recording_id: data.recording_id ?? null,
    status: data.status ?? null,
  })
}
