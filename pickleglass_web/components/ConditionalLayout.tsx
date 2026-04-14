'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ClientLayout from './ClientLayout'
import { useEffect } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '': 'Claire',
  activity: 'Activité',
  calendar: 'Calendrier',
  settings: 'Paramètres',
  'knowledge-base': 'Base de connaissances',
  tools: 'Outils',
  chat: 'Chat',
  profile: 'Profil',
  billing: 'Facturation',
  help: 'Aide',
  'ai-agents': 'Agents IA',
  auth: 'Authentification',
  login: 'Connexion',
  register: 'Inscription',
  pricing: 'Tarifs',
  subscription: 'Abonnement',
  dashboard: 'Dashboard',
  account: 'Compte',
  notifications: 'Notifications',
  integrations: 'Intégrations',
  documents: 'Documents',
  meetings: 'Réunions',
  inbox: 'Boîte de réception',
}

function getDocumentTitle(pathname: string | null) {
  if (!pathname) {
    return 'Claire'
  }

  const normalizedPath = pathname.split('?')[0].split('#')[0]
  const segments = normalizedPath.split('/').filter(Boolean)
  const primarySegment = segments[0] || ''

  if (primarySegment in PAGE_TITLES) {
    return PAGE_TITLES[primarySegment]
  }

  if (!primarySegment) {
    return 'Claire'
  }

  return primarySegment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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
