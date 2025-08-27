'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function SuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const sessionId = useMemo(() => params?.get('session_id') || '', [params])
  const flow = useMemo(() => params?.get('flow') || '', [params])

  useEffect(() => {
    if (flow !== 'mobile') {
      router.replace('/accueil')
      return
    }
    const state = 'state-' + Math.random().toString(36).slice(2, 10)
    const deepLink = `clairia://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
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

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}


