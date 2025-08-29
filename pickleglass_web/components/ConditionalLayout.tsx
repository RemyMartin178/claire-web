'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ClientLayout from './ClientLayout'
import SkeletonLoader from './SkeletonLoader'

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
  
  // Si on est en cours de chargement et qu'on n'est pas sur une page d'auth, afficher le skeleton
  if (loading && !isAuthenticated) {
    return <SkeletonLoader />
  }
  
  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
