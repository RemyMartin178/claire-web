'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// This page is opened in a popup by openOAuthPopup.
// It signals success/error to the parent via localStorage, then closes itself.
export default function AuthSuccessPage() {
    const searchParams = useSearchParams()
    const tool = searchParams.get('tool') || 'unknown'
    const error = searchParams.get('error')
    const [showFallback, setShowFallback] = useState(false)

    useEffect(() => {
        // Signal parent window via localStorage (works across cross-origin redirect chains)
        const key = error ? 'oauth_error' : 'oauth_success'
        const decodedError = error ? decodeURIComponent(error) : undefined
        const payload = JSON.stringify({ tool, error: decodedError, ts: Date.now() })
        try {
            localStorage.setItem(key, payload)
        } catch (e) {
            // ignore private browsing etc.
        }

        // Try postMessage as backup (works when COOP allows it)
        // Target the same origin only — never '*'
        if (window.opener) {
            try {
                window.opener.postMessage(
                    error
                        ? { type: 'oauth_error', tool, error: decodedError }
                        : { type: 'oauth_success', tool },
                    window.location.origin
                )
            } catch (e) { /* ignore COOP block */ }
        }

        // Close the popup immediately
        window.close()

        // If window.close() didn't work (some browsers block it),
        // show a fallback message via React state after 500ms
        const t = setTimeout(() => setShowFallback(true), 500)
        return () => clearTimeout(t)
    }, [tool, error])

    if (!showFallback) return null

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: '40px', background: '#fff' }}>
            <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{error ? '❌' : '✅'}</div>
                <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    {error ? 'Erreur' : 'Connexion réussie'}
                </h1>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>Vous pouvez fermer cette fenêtre.</p>
                <button
                    onClick={() => window.close()}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}
                >
                    Fermer
                </button>
            </div>
        </div>
    )
}
