'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  )
} 