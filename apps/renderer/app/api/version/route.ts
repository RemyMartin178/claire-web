import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy for app version check.
 * Returns the current version JSON directly from the Cloudflare CDN.
 */
export async function GET() {
  try {
    const res = await fetch("https://cdn.clairia.app/version.json", {
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch version information from CDN' }, { status: 502 });
    }

    const data = await res.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Version check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
