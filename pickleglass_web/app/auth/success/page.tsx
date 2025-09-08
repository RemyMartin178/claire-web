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
    <main className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
            Authentification réussie
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Vous allez être redirigé vers Glass automatiquement.
          </p>
        </div>

        {manual && deep && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Si la redirection ne démarre pas automatiquement,{' '}
              <a
                href={deep}
                className="inline underline hover:no-underline transition-all duration-200"
                style={{
                  color: 'var(--text-accent)',
                  textDecorationColor: 'var(--text-accent)'
                }}
              >
                cliquez ici
              </a>
            </p>
          </div>
        )}

        {debug && (
          <pre className="mt-6 text-xs whitespace-pre-wrap opacity-50" style={{ color: 'var(--text-secondary)' }}>
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

