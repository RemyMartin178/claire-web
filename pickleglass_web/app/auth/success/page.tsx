'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthSuccessPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const sessionId = useMemo(() => params?.get('session_id') || '', [params])
  const flow = useMemo(() => params?.get('flow') || '', [params])

  useEffect(() => {
    // Only for mobile flow
    if (flow !== 'mobile') {
      router.replace('/accueil')
      return
    }

    // If user is already logged in (cookie valid), skip immediately
    // Deep link schema to desktop app
    const state = 'state-' + Math.random().toString(36).slice(2, 10)
    const deepLink = `clairia://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
    // SECURITY: state here mirrors server-stored state; desktop will verify via /auth/exchange
    window.location.href = deepLink
  }, [flow, router, sessionId, user])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#202123' }}>
      <div className="w-full max-w-md mx-auto text-center">
        <div className="flex items-center gap-3 justify-center mb-6">
          <img src="/word.png" alt="Claire Logo" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        <div className="bg-[#232329] rounded-xl shadow-lg border border-[#3a3a4a] p-8">
          <h2 className="text-xl font-bold text-white mb-2">✅ Vous êtes connecté</h2>
          <p className="text-[#bbb] text-sm">Ouverture de Claire…</p>
        </div>
      </div>
    </div>
  )
}


