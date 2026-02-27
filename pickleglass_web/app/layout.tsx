import './globals.css'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import ConditionalLayout from '@/components/ConditionalLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PasswordModalProvider } from '@/contexts/PasswordModalContext'
import Analytics from '@/components/Analytics'
import { GA_TRACKING_ID } from '@/lib/gtag'
import { Toaster } from 'react-hot-toast'

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
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', { page_path: window.location.pathname });
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <PasswordModalProvider>
              <ConditionalLayout>
                <Analytics />
                {children}
                <Toaster position="bottom-right" toastOptions={{
                  duration: 3000,
                  className: 'dark-toast',
                  style: {
                    background: 'rgba(40, 40, 40, 0.85)',
                    color: '#fff',
                    borderRadius: '14px',
                    fontSize: '14px',
                    padding: '12px 20px',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    fontWeight: '500',
                  },
                  success: {
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#282828',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#ef4444',
                    },
                  },
                }} />
              </ConditionalLayout>
            </PasswordModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

