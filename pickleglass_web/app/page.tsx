'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Utilisateur connecté → redirection vers l'accueil
        router.push('/accueil')
      } else {
        // Utilisateur non connecté → redirection vers la page de connexion
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#202123' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9ca3af] mx-auto"></div>
          <p className="mt-4 text-white">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  return null
} 