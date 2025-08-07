'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function PersonalizeLayout({
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