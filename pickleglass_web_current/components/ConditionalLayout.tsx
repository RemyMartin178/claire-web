'use client'

import { usePathname } from 'next/navigation'
import ClientLayout from './ClientLayout'
import { AuthProvider } from '@/contexts/AuthContext'

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Check if current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register'
  
  if (isAuthPage) {
    // For auth pages, only provide AuthProvider without sidebar
    return (
      <AuthProvider>
        <div className="min-h-screen" style={{ background: '#1E1E1E' }}>
          {children}
        </div>
      </AuthProvider>
    )
  }
  
  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
