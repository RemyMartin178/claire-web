'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Redirection immédiate - l'AuthGuard gère déjà les cas de non-authentification
    if (isAuthenticated && user) {
      router.replace('/accueil')
    }
  }, [user, isAuthenticated, router])

  // Cette page ne devrait jamais être affichée directement
  return null
} 