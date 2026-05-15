import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, checkRateLimit } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REVENUECAT_API_URL = (process.env.REVENUECAT_API_URL || 'https://api.revenuecat.com/v1').replace(/\/+$/, '')
const REVENUECAT_API_KEY = process.env.REVENUECAT_SECRET_API_KEY || process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
const PRO_ENTITLEMENT_ID = process.env.REVENUECAT_PRO_ENTITLEMENT_ID || process.env.NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID || 'pro'

export async function GET(request: NextRequest) {
  const user = await verifyFirebaseToken(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`revenuecat-status:${user.uid}`, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  if (!REVENUECAT_API_KEY) {
    return NextResponse.json({
      configured: false,
      hasPro: false,
      activeEntitlements: [],
    })
  }

  const res = await fetch(`${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(user.uid)}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${REVENUECAT_API_KEY}`,
    },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[revenuecat/status] RevenueCat error:', res.status, detail)
    return NextResponse.json({ error: 'Failed to fetch RevenueCat status', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  const entitlements = data?.subscriber?.entitlements || {}
  const activeEntitlements = Object.entries(entitlements)
    .filter(([, value]: [string, any]) => {
      if (!value?.expires_date) return true
      return new Date(value.expires_date).getTime() > Date.now()
    })
    .map(([key]) => key)

  return NextResponse.json({
    configured: true,
    hasPro: activeEntitlements.includes(PRO_ENTITLEMENT_ID),
    activeEntitlements,
    customer: data?.subscriber || null,
  })
}
