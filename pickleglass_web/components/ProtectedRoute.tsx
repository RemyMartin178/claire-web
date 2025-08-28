'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Variable globale pour mémoriser l'état d'authentification
let globalAuthChecked = false
let globalAuthUser = null

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    if (!loading) {
      // Si on a déjà vérifié l'auth et qu'on a un utilisateur, on ne recharge plus
      if (globalAuthChecked && globalAuthUser) {
        setLocalLoading(false)
        return
      }

      // Première vérification ou utilisateur changé
      globalAuthChecked = true
      globalAuthUser = user
      setLocalLoading(false)

      if (!user) {
        // Rediriger vers la landing page au lieu de /login
        window.location.replace('https://clairia.app')
      }
    }
  }, [user, loading])

  // Afficher un loader seulement lors de la première vérification
  if (loading || localLoading) {
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