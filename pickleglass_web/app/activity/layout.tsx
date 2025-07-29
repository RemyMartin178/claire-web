'use client'

import ClientLayout from '@/components/ClientLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientLayout>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </ClientLayout>
  )
} 