import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/login', '/register'],
}
