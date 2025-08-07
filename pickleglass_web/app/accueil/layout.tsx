'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function AccueilLayout({
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