// Vercel Edge Middleware — renderer.clairia.app
// No access restrictions: accessible from both Electron and regular browsers.

export default function middleware(_request) {
  return // pass through for all clients
}

export const config = {
  matcher: '/(.*)',
}
