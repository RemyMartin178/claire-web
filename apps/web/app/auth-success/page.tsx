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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", textAlign: 'center', padding: '40px', background: '#fff' }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: error ? '#fef2f2' : '#f0fdf4', margin: '0 auto 16px' }}>
                    {error ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    )}
                </div>
                <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1D1D1F' }}>
                    {error ? 'Erreur de connexion' : 'Connexion réussie'}
                </h1>
                <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>Vous pouvez fermer cette fenêtre.</p>
                <button
                    onClick={() => window.close()}
                    style={{ padding: '10px 24px', borderRadius: '100px', border: '1px solid #e5e5ea', background: '#f5f5f7', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#1D1D1F' }}
                >
                    Fermer
                </button>
            </div>
        </div>
    )
}
