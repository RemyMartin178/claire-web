'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Si on est sur une page d'auth et qu'on est connecté, rediriger vers l'activité
    if (isAuthenticated && user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      router.replace('/activity')
      return
    }

    // Si on n'est pas authentifié et qu'on n'est pas sur une page d'auth, rediriger vers login
    // Mais seulement si on n'est pas en cours de chargement
    if (!loading && !isAuthenticated && !pathname?.startsWith('/auth/') && pathname !== '/login' && pathname !== '/register' && !pathname?.startsWith('/settings/') && pathname !== '/settings') {
      router.replace('/login')
      return
    }

    // Pour les pages settings, rediriger vers login seulement si on n'est pas en cours de chargement ET pas authentifié
    if (!loading && !isAuthenticated && (pathname?.startsWith('/settings/') || pathname === '/settings')) {
      router.replace('/login')
      return
    }
  }, [user, loading, isAuthenticated, pathname, router])

  // Si on est sur une page d'auth, toujours afficher le contenu
  if (pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register') {
    return <>{children}</>
  }

  // Pour la page racine, ne rien afficher si pas authentifié ou en cours de chargement
  if (pathname === '/' && (!isAuthenticated || loading)) {
    return null
  }

  // Pour les pages settings, permettre l'accès même si en cours de chargement
  if (pathname?.startsWith('/settings/') || pathname === '/settings') {
    // Toujours afficher le contenu pour les pages settings, même pendant le chargement
    return <>{children}</>
  }

  // Pour les autres pages, ne rien afficher si pas authentifié ou en cours de chargement
  if (!isAuthenticated || loading) {
    return null
  }

  // Afficher le contenu seulement si authentifié
  return <>{children}</>
}
