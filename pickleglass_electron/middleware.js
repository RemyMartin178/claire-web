// Vercel Edge Middleware — runs before every request on renderer.clairia.app
// Blocks all non-Electron browsers. The Electron User-Agent always contains "Electron".

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || ''

  // Allow Electron app requests
  if (ua.includes('Electron')) {
    return // pass through
  }

  // Block everything else — returns HTTP 503 with no body
  // Chrome will show: "Cette page ne fonctionne pas — HTTP ERROR 503"
  return new Response(null, { status: 503 })
}

export const config = {
  matcher: '/(.*)',
}
