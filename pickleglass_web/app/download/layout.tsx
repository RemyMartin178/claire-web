'use client'

import ClientLayout from '@/components/ClientLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function DownloadLayout({
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