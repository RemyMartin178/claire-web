'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

function SuccessContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const flow = sp.get('flow')
  const sessionId = sp.get('session_id') || sp.get('sessionId')
  const debug = sp.get('debug') === '1'
  const [manual, setManual] = useState(true)

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

    const t = setTimeout(() => {
      try {
        window.location.href = deep
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [flow, deep, router])

  if (flow !== 'mobile') return null

  return (
    <main className="min-h-screen bg-subtle-bg flex items-center justify-center px-6 py-12">
      <Card className="bg-white w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-heading font-semibold text-[#282828]">
              Authentification réussie
            </h1>

            <p className="text-sm leading-relaxed text-gray-600">
              Vous allez être redirigé vers Claire automatiquement.
            </p>
          </div>

          {manual && deep && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Si la redirection ne démarre pas automatiquement,{' '}
                <a
                  href={deep}
                  className="inline underline hover:no-underline transition-all duration-200 text-primary hover:text-primary-hover"
                >
                  cliquez ici
                </a>
              </p>
            </div>
          )}

          {debug && (
            <pre className="mt-6 text-xs whitespace-pre-wrap opacity-50 text-gray-500">
{`flow=${flow}
sessionId=${sessionId}
deep=${deep}
state=${state}`}
            </pre>
          )}
        </CardContent>
      </Card>
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
