import './globals.css'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import ConditionalLayout from '@/components/ConditionalLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PasswordModalProvider } from '@/contexts/PasswordModalContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Claire - Assistant IA',
  description: 'Personalized AI Assistant for various contexts',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <PasswordModalProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </PasswordModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 
