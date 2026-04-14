/**
 * Proxy Next.js → Railway for /api/v1/tools/*
 *
 * Verifies the Firebase ID token server-side (Firebase Admin already configured
 * in this Next.js app), then forwards the request to Railway signed with JWT_SECRET.
 * Railway never needs its own Firebase credentials.
 */
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const RAILWAY_URL =
  process.env.API_URL ||
  'https://claire-web-production.up.railway.app'

const JWT_SECRET = process.env.JWT_SECRET || ''
const TOOL_PROXY_PERMISSIONS = [
  'tools:read',
  'tools:execute',
  'tools:configure',
  'tools:manage',
  'tools:analytics',
]

async function getFirebaseUid(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    // Use Firebase Admin (already initialised via firebaseAdmin.ts) to verify the token
    const { ensureFirebaseAdminInitialized } = await import('@/utils/firebaseAdmin')
    const adminAuth = ensureFirebaseAdminInitialized()
    if (!adminAuth) return null
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}

async function buildRailwayAuth(uid: string): Promise<string> {
  if (!JWT_SECRET) return ''
  const secret = new TextEncoder().encode(JWT_SECRET)
  return new SignJWT({
    userId: uid,
    sub: uid,
    role: 'user',
    permissions: TOOL_PROXY_PERMISSIONS,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

async function proxyToRailway(
  req: NextRequest,
  path: string[],
  method: string,
): Promise<NextResponse> {
  const uid = await getFirebaseUid(req.headers.get('authorization'))

  const railwayPath = `/api/v1/tools/${path.join('/')}`
  const url = new URL(railwayPath, RAILWAY_URL)
  // Forward query params
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (uid) {
    if (JWT_SECRET) {
      headers['Authorization'] = `Bearer ${await buildRailwayAuth(uid)}`
    }
    headers['X-User-ID'] = uid
    headers['x-user-id'] = uid
  }

  const body =
    method !== 'GET' && method !== 'HEAD' ? await req.text() : undefined

  const res = await fetch(url.toString(), { method, headers, body })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyToRailway(req, path, 'GET')
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyToRailway(req, path, 'POST')
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyToRailway(req, path, 'PUT')
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyToRailway(req, path, 'DELETE')
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyToRailway(req, path, 'PATCH')
}
