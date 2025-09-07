'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const flow = sp.get('flow')
  const sessionId = sp.get('session_id') || sp.get('sessionId')
  const debug = sp.get('debug') === '1'
  const [manual, setManual] = useState(true) // afficher le bouton immédiatement

  const state = useMemo(() => 'st-' + Math.random().toString(36).slice(2, 10), [])
  const deep = useMemo(() => {
    if (!sessionId) return null
    return `pickleglass://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
  }, [sessionId, state])

  useEffect(() => {
    if (flow !== 'mobile') {
      router.replace('/activity')
      return
    }
    if (!deep) return

    // On tente une redirection douce, tout en gardant le bouton manuel visible
    const t = setTimeout(() => {
      try {
        window.location.href = deep
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [flow, deep, router])

  if (flow !== 'mobile') return null

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div
        className="w-full max-w-md text-center rounded-2xl border p-8 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-elevated-primary)',
          borderColor: 'var(--card-border)',
          color: 'var(--text-primary)'
        }}
      >
        <div className="mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22Z" fill="#22C55E"/>
            <path d="M10.0 15.0L7.5 12.5L6.4 13.6L10.0 17.2L17.6 9.6L16.5 8.5L10.0 15.0Z" fill="white"/>
          </svg>
        </div>

        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Connexion réussie !
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Authentification réussie. Vous allez être redirigé vers Glass.
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Vous pouvez fermer cette fenêtre. Si la redirection ne démarre pas automatiquement,
          utilisez le bouton ci‑dessous.
        </p>

        {manual && deep && (
          <a
            href={deep}
            className="mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#2563eb',
              color: 'white'
            }}
          >
            Ouvrir l'application Glass
          </a>
        )}

        {debug && (
          <pre className="mt-4 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
{`flow=${flow}
sessionId=${sessionId}
deep=${deep}
state=${state}`}
          </pre>
        )}
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}

