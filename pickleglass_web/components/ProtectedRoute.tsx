'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { UserProfile } from '@/utils/api'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    // Si pas d'authentification et pas en cours de chargement, rediriger immédiatement
    if (!loading && !isAuthenticated) {
      sessionStorage.removeItem('authChecked')
      sessionStorage.removeItem('authUserId')
      window.location.replace('/login')
      return
    }

    // Si authentifié, vérifier le sessionStorage pour éviter les re-vérifications
    if (isAuthenticated && user) {
      const authChecked = sessionStorage.getItem('authChecked')
      const authUserId = sessionStorage.getItem('authUserId')
      
      if (authChecked === 'true' && authUserId === user?.uid) {
        setHasCheckedAuth(true)
        return
      }

      // Première vérification ou utilisateur différent
      sessionStorage.setItem('authChecked', 'true')
      sessionStorage.setItem('authUserId', user?.uid || '')
      setHasCheckedAuth(true)
    }
  }, [user, loading, isAuthenticated])

  // Afficher un loader seulement si on est en cours de chargement ET qu'on n'a pas encore vérifié l'auth
  if (loading || (!hasCheckedAuth && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#202123' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9ca3af] mx-auto"></div>
          <p className="mt-4 text-white">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  // Si pas d'utilisateur ou pas authentifié, ne rien afficher (redirection en cours)
  if (!user || !isAuthenticated) {
    return null
  }

  // Si utilisateur connecté et authentifié, afficher le contenu
  return <>{children}</>
} 
