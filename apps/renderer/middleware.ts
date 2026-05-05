import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://app.clairia.app',
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Allow localhost on any port for development
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/mobile-auth/')) {
    const origin = request.headers.get('origin')
    const allowedOrigin = isAllowedOrigin(origin) ? (origin as string) : null

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin) {
        return new NextResponse(null, { status: 403 })
      }
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const response = NextResponse.next()
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    }
    return response
  }

  // Redirect /login to /auth/login (preserve query params)
  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect /register to /auth/register (preserve query params)
  if (pathname === '/register') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/register'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/register', '/api/mobile-auth/:path*'],
}
