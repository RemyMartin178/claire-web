'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ClientLayout from './ClientLayout'
import { useEffect } from 'react'

const PAGE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/activity', title: 'Activite' },
  { prefix: '/calendar', title: 'Calendrier' },
  { prefix: '/settings', title: 'Parametres' },
  { prefix: '/knowledge-base', title: 'Base de connaissances' },
  { prefix: '/tools', title: 'Outils' },
  { prefix: '/chat', title: 'Chat' },
  { prefix: '/profile', title: 'Profil' },
  { prefix: '/billing', title: 'Facturation' },
  { prefix: '/help', title: 'Aide' },
  { prefix: '/ai-agents', title: 'Agents IA' },
]

function getDocumentTitle(pathname: string | null) {
  if (!pathname || pathname === '/') {
    return 'Claire | Assistant IA en temps reel'
  }

  const match = PAGE_TITLES.find(({ prefix }) => pathname.startsWith(prefix))
  if (!match) {
    return 'Claire | Assistant IA en temps reel'
  }

  return `${match.title} | Claire`
}

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()

  // Check if current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register'
  const isDebugPage = pathname === '/fettywapdebug'

  // Rediriger vers le login si pas authentifié et pas sur une page d'auth
  useEffect(() => {
    if (isDebugPage) return
    if (!loading && !isAuthenticated && !isAuthPage) {
      // Donner un délai supplémentaire pour Firebase Auth après retour de Stripe
      const timer = setTimeout(() => {
        // Vérifier à nouveau l'authentification après le délai
        if (!isAuthenticated && !isAuthPage) {
          // Sauvegarder l'URL actuelle avant de rediriger vers login
          const currentPath = window.location.pathname + window.location.search
          if (currentPath !== '/auth/login' && !currentPath.startsWith('/auth/')) {
            sessionStorage.setItem('redirect_after_login', currentPath)
          }
          router.replace('/auth/login')
        }
      }, 500) // Délai de 500ms pour laisser Firebase Auth se réinitialiser

      return () => clearTimeout(timer)
    }
  }, [loading, isAuthenticated, isAuthPage, isDebugPage, router])

  useEffect(() => {
    document.title = getDocumentTitle(pathname)
  }, [pathname])

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  // Allow the debug page to render (AdminGuard inside the page will control access)
  if (isDebugPage) {
    if (loading) return null
    return <ClientLayout>{children}</ClientLayout>
  }

  // Si on n'est pas authentifié OU en cours de chargement, ne rien afficher (redirection en cours)
  if (!isAuthenticated || loading) {
    return null
  }

  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
