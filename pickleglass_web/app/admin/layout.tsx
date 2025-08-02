import ClientLayout from '@/components/ClientLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <ClientLayout>
        {children}
      </ClientLayout>
    </ProtectedRoute>
  )
} 