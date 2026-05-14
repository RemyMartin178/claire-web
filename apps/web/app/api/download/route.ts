import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CDN_BASE = 'https://cdn.clairia.app';

function detectPlatform(userAgent: string): 'win' | 'mac' | 'linux' {
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'win';
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac';
  return 'linux';
}

/**
 * Dynamic download redirect — detects OS from User-Agent (or ?platform= override).
 * version.json format on CDN:
 * {
 *   "version": "0.2.4",
 *   "files": { "win": "Claire Setup 0.2.4.exe", "mac": "Claire 0.2.4.dmg", "linux": "Claire 0.2.4.AppImage" }
 * }
 * To release a new version: upload new file + update version.json on Cloudflare R2. No code deploy needed.
 */
export async function GET(request: NextRequest) {
  try {
    // ?platform=win|mac|linux allows landing page buttons to force a specific platform
    const platformParam = request.nextUrl.searchParams.get('platform') as 'win' | 'mac' | 'linux' | null;
    const ua = request.headers.get('user-agent') ?? '';
    const platform = (['win', 'mac', 'linux'].includes(platformParam ?? ''))
      ? (platformParam as 'win' | 'mac' | 'linux')
      : detectPlatform(ua);

    const res = await fetch(`${CDN_BASE}/version.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`CDN unreachable: ${res.status}`);

    const data = await res.json();

    // Support both legacy { version: "x.y.z" } (mac only) and new { files: { win, mac, linux } }
    let fileName: string | undefined;
    if (data.files?.[platform]) {
      fileName = data.files[platform];
    } else if (platform === 'mac' && data.version) {
      fileName = `Claire ${data.version}.dmg`;
    }

    if (!fileName) {
      return NextResponse.json({ error: `No build available for: ${platform}` }, { status: 404 });
    }

    return NextResponse.redirect(`${CDN_BASE}/${fileName}`, {
      status: 307,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[download] redirect error:', error);
    return NextResponse.json({ error: 'Download unavailable' }, { status: 500 });
  }
}
