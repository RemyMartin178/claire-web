'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function SuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [countdown, setCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const sessionId = useMemo(() => params?.get('session_id') || '', [params])
  const flow = useMemo(() => params?.get('flow') || '', [params])

  useEffect(() => {
    if (flow !== 'mobile') {
      router.replace('/accueil')
      return
    }

    // Compte à rebours avant redirection automatique
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true)
          const state = 'state-' + Math.random().toString(36).slice(2, 10)
          const deepLink = `pickleglass://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
          window.location.href = deepLink
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [flow, router, sessionId, user])

  const handleManualRedirect = () => {
    setIsRedirecting(true)
    const state = 'state-' + Math.random().toString(36).slice(2, 10)
    const deepLink = `pickleglass://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
    window.location.href = deepLink
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in" style={{ background: '#202123' }}>
      <div className="w-full max-w-md mx-auto text-center">
        {/* Logo en haut à gauche avec animation */}
        <div className="absolute top-8 left-8 flex items-center gap-3 animate-slide-in">
          <img src="/word.png" alt="Claire Logo" className="w-16 h-16 animate-bounce-gentle" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        
        <div className="bg-[#232329] rounded-2xl shadow-cluely border border-[#3a3a4a] p-8 hover-lift backdrop-blur-md animate-scale-in">
          <div className="mb-6 animate-fade-in">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentification réussie !</h2>
            <p className="text-[#bbb] text-sm">Vous allez être redirigé vers Claire dans {countdown} seconde{countdown > 1 ? 's' : ''}...</p>
          </div>

          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handleManualRedirect}
              disabled={isRedirecting}
              className="w-full bg-accent-light hover:bg-accent-light/90 text-white py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center hover:shadow-cluely-hover group"
            >
              {isRedirecting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Redirection...
                </div>
              ) : (
                <>
                  Ouvrir Claire maintenant
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-[#bbb] text-xs">
                Si l&apos;application ne s&apos;ouvre pas automatiquement, cliquez sur le bouton ci-dessus
              </p>
            </div>
          </div>
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


