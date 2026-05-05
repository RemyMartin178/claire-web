import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = ['success', 'error', 'cancelled'] as const

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const tool = searchParams.get('tool') || 'google_calendar'
    const statusParam = searchParams.get('status') || 'success'
    const error = searchParams.get('error') || ''

    if (!ALLOWED_STATUSES.includes(statusParam as (typeof ALLOWED_STATUSES)[number])) {
        return new Response('Invalid status', { status: 400 })
    }

    const status = statusParam

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentification...</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            background: #fff;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <script>
        (function() {
            const payload = {
                type: 'oauth_result',
                tool: ${JSON.stringify(tool)},
                status: ${JSON.stringify(status)},
                error: ${JSON.stringify(error)},
                ts: Date.now()
            };

            console.log('Sending OAuth result:', payload);

            // 1. BroadcastChannel (Modern & reliable)
            try {
                const bc = new BroadcastChannel('oauth_channel');
                bc.postMessage(payload);
                bc.close();
            } catch (e) {
                console.error('BroadcastChannel failed:', e);
            }

            // 2. localStorage (Legacy fallback)
            try {
                localStorage.setItem('oauth_result', JSON.stringify(payload));
            } catch (e) {
                console.error('localStorage failed:', e);
            }

            // 3. postMessage (Direct window link)
            try {
                if (window.opener) {
                    window.opener.postMessage(payload, window.location.origin);
                }
            } catch (e) {
                console.error('postMessage failed:', e);
            }

            // Close window quickly
            setTimeout(() => {
                window.close();
            }, 100);
        })();
    </script>
</body>
</html>`

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'"
        }
    })
}
