export const runtime = 'edge'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function sha256(input: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  // @ts-ignore
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    const arr = Array.from(new Uint8Array(buf))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ipHeader = req.headers.get('x-forwarded-for') || ''
    const ip = ipHeader.split(',')[0]?.trim() || '0.0.0.0'
    const salt = process.env.IP_SALT || 'salt'
    const ipHash = await sha256(ip + salt)

    const geo = (req as any).geo || {}
    const userAgent = req.headers.get('user-agent') || ''

    const normalized = {
      ...body,
      ipHash,
      geo: {
        country: geo?.country,
        region: geo?.region,
        city: geo?.city,
        lat: geo?.latitude ? Number(geo.latitude) : undefined,
        lon: geo?.longitude ? Number(geo.longitude) : undefined,
      },
      ua: { raw: userAgent },
    }

    // Forward to a Node serverless writer for Firestore persistence
    try {
      await fetch(new URL(req.url).origin + '/api/collect/write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalized)
      })
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}


