'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function ActivityLayout({
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