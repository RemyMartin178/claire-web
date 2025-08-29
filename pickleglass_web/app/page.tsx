'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    // Redirection immédiate basée sur l'état d'authentification
    if (isAuthenticated && user) {
      router.replace('/accueil')
    } else if (!loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [user, loading, isAuthenticated, router])

  // Afficher un loader seulement si on est en cours de chargement ET qu'on n'a pas encore déterminé l'état
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#202123' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9ca3af] mx-auto"></div>
          <p className="mt-4 text-white">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  // Ne rien afficher pendant les redirections
  return null
} 