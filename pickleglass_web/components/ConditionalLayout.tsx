'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ClientLayout from './ClientLayout'

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { loading, isAuthenticated } = useAuth()
  
  // Check if current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register'
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen" style={{ background: '#202123' }}>
        {children}
      </div>
    )
  }
  
  // Si on n'est pas authentifié OU en cours de chargement, ne rien afficher
  if (!isAuthenticated || loading) {
    return null
  }
  
  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
