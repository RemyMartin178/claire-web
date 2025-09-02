'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()

  useEffect(() => {
    // Rediriger vers l'activité seulement si l'utilisateur est authentifié
    if (isAuthenticated && user && !loading) {
      router.replace('/activity')
    }
    // Rediriger vers le login si pas authentifié et pas en cours de chargement
    else if (!loading && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [user, isAuthenticated, loading, router])

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // Si pas authentifié, afficher un message ou rediriger vers login
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bienvenue sur Claire</h1>
          <p>Veuillez vous connecter pour continuer.</p>
        </div>
      </div>
    )
  }

  return null
} 
