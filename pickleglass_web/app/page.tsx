'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()

  useEffect(() => {
    // Redirection immédiate - l'AuthGuard gère déjà les cas de non-authentification
    if (isAuthenticated && user) {
      router.replace('/activity')
    }
  }, [user, isAuthenticated, router])

  // Ne jamais afficher cette page - laisser l'AuthGuard gérer les redirections
  return null
} 