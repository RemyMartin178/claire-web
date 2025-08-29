'use client'

import { Suspense, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import SkeletonLoader from './SkeletonLoader'

interface AuthGuardProps {
  children: React.ReactNode
}

function AuthGuardContent({ children }: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Si on est sur une page d'auth et qu'on est connecté, rediriger vers l'accueil
    if (isAuthenticated && user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      router.replace('/accueil')
      return
    }

    // Si on n'est pas authentifié et qu'on n'est pas sur une page d'auth, rediriger vers login
    if (!loading && !isAuthenticated && !pathname?.startsWith('/auth/') && pathname !== '/login' && pathname !== '/register') {
      setIsRedirecting(true)
      router.replace('/login')
      return
    }
  }, [user, loading, isAuthenticated, pathname, router])

  // Afficher le skeleton pendant le chargement ou la redirection
  if (loading || isRedirecting) {
    return <SkeletonLoader />
  }

  // Si on est sur une page d'auth et qu'on n'est pas connecté, afficher le contenu
  if (pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register') {
    return <>{children}</>
  }

  // Si on n'est pas authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return null
  }

  // Si on est authentifié, afficher le contenu
  return <>{children}</>
}

export default function AuthGuard({ children }: AuthGuardProps) {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  )
}
