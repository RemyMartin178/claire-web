'use client'

import { AuthProvider } from '@/contexts/AuthContext'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen" style={{ background: '#202123' }}>
        {children}
      </div>
    </AuthProvider>
  )
} 