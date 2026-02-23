import './globals.css'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import ConditionalLayout from '@/components/ConditionalLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PasswordModalProvider } from '@/contexts/PasswordModalContext'
import Analytics from '@/components/Analytics'
import { GA_TRACKING_ID } from '@/lib/gtag'

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
              </ConditionalLayout>
            </PasswordModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

