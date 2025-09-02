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
  
  // Rediriger vers le login si pas authentifié et pas sur une page d'auth
  useEffect(() => {
    if (!loading && !isAuthenticated && !isAuthPage) {
      router.replace('/auth/login')
    }
  }, [loading, isAuthenticated, isAuthPage, router])
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen" style={{ background: '#202123' }}>
        {children}
      </div>
    )
  }
  
  // Si on n'est pas authentifié OU en cours de chargement, ne rien afficher (redirection en cours)
  if (!isAuthenticated || loading) {
    return null
  }
  
  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
