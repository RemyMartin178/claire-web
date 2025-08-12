'use client'

import ProtectedRoute from '@/components/ProtectedRoute'

export default function HelpLayout({
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