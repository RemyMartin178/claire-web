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

  // Pendant le chargement ou si pas authentifié, ne rien afficher (redirection en cours)
  if (loading || !isAuthenticated) {
    return null
  }

  return null
} 
