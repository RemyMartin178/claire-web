'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ElectronClientLayout from './ElectronClientLayout'
import { SharedStateProvider } from '@/contexts/SharedStateContext'
import { getElectronLoginPath } from '@/utils/electron'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'

const PAGE_TITLES: Record<string, string> = {
  '': 'Claire',
  activity: 'Activite',
  calendar: 'Calendrier',
  settings: 'Parametres',
  'knowledge-base': 'Base de connaissances',
  tools: 'Outils',
  chat: 'Chat',
  profile: 'Profil',
  billing: 'Facturation',
  help: 'Aide',
  'ai-agents': 'Agents IA',
  auth: 'Authentification',
  login: 'Connexion',
  register: 'Inscription',
  pricing: 'Tarifs',
  subscription: 'Abonnement',
  dashboard: 'Dashboard',
  account: 'Compte',
  notifications: 'Notifications',
  integrations: 'Integrations',
  documents: 'Documents',
  meetings: 'Reunions',
  inbox: 'Boite de reception',
  electron: 'Electron',
}

function normalizePath(pathname: string | null | undefined) {
  if (!pathname || pathname === '/') return '/'
  return pathname.split('?')[0].split('#')[0].replace(/\/+$/, '')
}

function getDocumentTitle(pathname: string | null) {
  if (!pathname) {
    return 'Claire'
  }

  const normalizedPath = pathname.split('?')[0].split('#')[0]
  const segments = normalizedPath.split('/').filter(Boolean)
  const primarySegment = segments[0] || ''

  if (primarySegment in PAGE_TITLES) {
    return PAGE_TITLES[primarySegment]
  }

  if (!primarySegment) {
    return 'Claire'
  }

  return primarySegment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const isElectronRuntime = true

  useEffect(() => {
    if (!resolvedTheme) return
    const api = (window as any).api
    void api?.dashboard?.setTheme?.(resolvedTheme)
  }, [resolvedTheme])

  const electronLoginPath = getElectronLoginPath()
  const normalizedPathname = normalizePath(pathname)
  const isAuthPage =
    normalizedPathname.startsWith('/auth/') ||
    normalizedPathname === '/login' ||
    normalizedPathname === '/register' ||
    normalizedPathname === electronLoginPath
  const isDebugPage = normalizedPathname === '/fettywapdebug'
  const isBareWindow = normalizedPathname === '/notification'

  if (isBareWindow) {
    return <>{children}</>
  }

  useEffect(() => {
    if (isElectronRuntime === null) return
    if (isDebugPage) return
    if (!loading && !isAuthenticated && !isAuthPage) {
      const timer = setTimeout(() => {
        if (!isAuthenticated && !isAuthPage) {
          const currentPath = normalizePath(window.location.pathname) + window.location.search
          if (
            currentPath !== '/auth/login' &&
            currentPath !== electronLoginPath &&
            !currentPath.startsWith('/auth/')
          ) {
            sessionStorage.setItem('redirect_after_login', currentPath)
          }
          router.replace(isElectronRuntime ? electronLoginPath : '/auth/login')
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [loading, isAuthenticated, isAuthPage, isDebugPage, isElectronRuntime, electronLoginPath, router])

  useEffect(() => {
    document.title = getDocumentTitle(pathname)
  }, [pathname])

  useEffect(() => {
    const api = (window as any).api
    void api?.dashboard?.setTitleBarOverlayVisible?.(!isAuthPage)
    void api?.dashboard?.setOnboardingMode?.(isAuthPage)
  }, [isAuthPage])

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  if (isDebugPage) {
    if (loading) return null
    return (
      <SharedStateProvider>
        <ElectronClientLayout>{children}</ElectronClientLayout>
      </SharedStateProvider>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/15 border-t-foreground/70 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SharedStateProvider>
      <ElectronClientLayout>{children}</ElectronClientLayout>
    </SharedStateProvider>
  )
}
