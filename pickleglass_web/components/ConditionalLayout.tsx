'use client'

import { usePathname } from 'next/navigation'
import ClientLayout from './ClientLayout'
// AuthProvider is now at root layout to avoid multiple React roots

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Check if current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register'
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen" style={{ background: '#1E1E1E' }}>
        {children}
      </div>
    )
  }
  
  // For all other pages, use the full ClientLayout with sidebar
  return <ClientLayout>{children}</ClientLayout>
}
