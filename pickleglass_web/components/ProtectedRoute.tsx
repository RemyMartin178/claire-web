'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { UserProfile } from '@/utils/api'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    // Vérifier si on a déjà fait la vérification d'auth dans cette session
    const authChecked = sessionStorage.getItem('authChecked')
    const authUserId = sessionStorage.getItem('authUserId')
    
    if (!loading) {
      if (authChecked === 'true' && authUserId === user?.uid) {
        // On a déjà vérifié l'auth pour cet utilisateur dans cette session
        setHasCheckedAuth(true)
        return
      }

      // Première vérification ou utilisateur différent
      sessionStorage.setItem('authChecked', 'true')
      sessionStorage.setItem('authUserId', user?.uid || '')
      setHasCheckedAuth(true)

      if (!user) {
        // Rediriger vers la landing page au lieu de /login
        window.location.replace('https://clairia.app')
      }
    }
  }, [user, loading])

  // Afficher un loader seulement lors de la première vérification
  if (loading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#202123' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9ca3af] mx-auto"></div>
          <p className="mt-4 text-white">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  // Si pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  // Si utilisateur connecté, afficher le contenu
  return <>{children}</>
} 