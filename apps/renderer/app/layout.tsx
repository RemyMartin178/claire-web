import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: { default: 'Claire', template: '%s' },
  description: 'Claire transcrit et analyse vos réunions en temps réel, génère vos comptes-rendus et vous apporte des suggestions contextuelles pendant vos appels et visioconférences.',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Claire',
    description: 'Claire transcrit et analyse vos réunions en temps réel, génère vos comptes-rendus et vous apporte des suggestions contextuelles pendant vos appels et visioconférences.',
    url: 'https://www.clairia.app',
    siteName: 'Claire',
    locale: 'fr_FR',
    type: 'website',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Claire',
              url: 'https://www.clairia.app',
            }),
          }}
        />
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
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
