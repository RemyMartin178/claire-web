'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ClientLayout from './ClientLayout'
import { useEffect } from 'react'

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
      // Sauvegarder l'URL actuelle avant de rediriger vers login
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== '/auth/login' && !currentPath.startsWith('/auth/')) {
        sessionStorage.setItem('redirect_after_login', currentPath)
      }
      router.replace('/auth/login')
    }
  }, [loading, isAuthenticated, isAuthPage, isDebugPage, router])
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen" style={{ background: '#202123' }}>
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
