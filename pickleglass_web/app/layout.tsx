import './globals.css'
import { Inter } from 'next/font/google'
import ConditionalLayout from '@/components/ConditionalLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PasswordModalProvider } from '@/contexts/PasswordModalContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Claire - Assistant IA',
  description: 'Personalized AI Assistant for various contexts',
  // no site icon (favicon) per request
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className} style={{ background: '#202123' }}>
        <AuthProvider>
          <PasswordModalProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </PasswordModalProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 
