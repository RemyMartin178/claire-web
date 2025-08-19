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
        // Utilisateur connecté → redirection vers le dashboard
        router.push('/dashboard')
      } else {
        // Utilisateur non connecté → redirection vers clairia.app
        router.push('https://clairia.app')
      }
    }
  }, [user, loading, router])

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">V&eacute;rification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  return null
} 