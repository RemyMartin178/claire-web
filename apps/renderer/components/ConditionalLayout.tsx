'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ElectronClientLayout from './ElectronClientLayout'
import { SharedStateProvider } from '@/contexts/SharedStateContext'
import { getElectronLoginPath } from '@/utils/electron'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { completeOnboarding, getCachedSessions, getSessions, getUserSettings } from '@/utils/api'

export const ONBOARDING_COMPLETED_EVENT = 'claire:onboarding-completed'

const COLOR_THEME_TO_PREFERENCE: Record<string, 'light' | 'dark' | 'system'> = {
  Clair: 'light',
  Sombre: 'dark',
  'Système': 'system',
}

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
  onboarding: 'Bienvenue',
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
  const { theme, setTheme } = useTheme()
  const isElectronRuntime = true

  useEffect(() => {
    if (!theme || !['light', 'dark', 'system'].includes(theme)) return
    const api = (window as any).api
    void api?.sharedState?.patch?.({ theme })
  }, [theme])

  const electronLoginPath = getElectronLoginPath()
  const normalizedPathname = normalizePath(pathname)
  const isAuthPage =
    normalizedPathname.startsWith('/auth/') ||
    normalizedPathname === '/login' ||
    normalizedPathname === '/register' ||
    normalizedPathname === electronLoginPath
  const isDebugPage = normalizedPathname === '/fettywapdebug'
  const isBareWindow = normalizedPathname === '/notification'
  const isOnboardingPage = normalizedPathname === '/onboarding'

  // 'unknown' = statut pas encore résolu depuis Firestore ; on ne rend rien
  // tant qu'il n'est pas connu pour éviter un flash du dashboard avant redirect.
  const [onboardingStatus, setOnboardingStatus] = useState<'unknown' | 'required' | 'completed'>('unknown')

  useEffect(() => {
    if (isBareWindow || isDebugPage || isAuthPage) return
    if (loading || !isAuthenticated) return
    if (onboardingStatus !== 'unknown') return

    let cancelled = false
    void (async () => {
      try {
        const settings = await getUserSettings()
        if (cancelled) return

        // Réconciliation thème au boot : la préférence Firestore doit s'appliquer
        // dès le chargement, pas seulement à l'ouverture du Settings modal.
        const themePreference = settings.colorTheme
          ? COLOR_THEME_TO_PREFERENCE[settings.colorTheme]
          : undefined
        if (themePreference) setTheme(themePreference)

        const onboarding = settings.onboarding
        if (onboarding?.completed) {
          setOnboardingStatus('completed')
          return
        }

        // Comptes existants (créés avant l'onboarding) : exemption silencieuse
        // dès qu'au moins une session existe.
        let sessions = getCachedSessions()
        if (!sessions) {
          sessions = await getSessions().catch(() => [])
        }
        if (cancelled) return
        if (sessions.length > 0) {
          setOnboardingStatus('completed')
          void completeOnboarding({ version: 'legacy-exempt' }).catch(() => {})
          return
        }

        setOnboardingStatus('required')
      } catch {
        // Fail-open : une erreur Firestore ne doit jamais piéger l'utilisateur
        // hors du dashboard.
        if (!cancelled) setOnboardingStatus('completed')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, isAuthenticated, isAuthPage, isBareWindow, isDebugPage, onboardingStatus, setTheme])

  useEffect(() => {
    const handleCompleted = () => setOnboardingStatus('completed')
    window.addEventListener(ONBOARDING_COMPLETED_EVENT, handleCompleted)
    return () => window.removeEventListener(ONBOARDING_COMPLETED_EVENT, handleCompleted)
  }, [])

  // Un autre compte peut se connecter dans la même fenêtre : le statut
  // onboarding doit être re-résolu pour lui.
  useEffect(() => {
    if (!loading && !isAuthenticated) setOnboardingStatus('unknown')
  }, [loading, isAuthenticated])

  useEffect(() => {
    if (isBareWindow || isDebugPage || isAuthPage) return
    if (loading || !isAuthenticated) return
    if (onboardingStatus === 'required' && !isOnboardingPage) {
      router.replace('/onboarding')
    } else if (onboardingStatus === 'completed' && isOnboardingPage) {
      router.replace('/activity')
    }
  }, [onboardingStatus, isOnboardingPage, isBareWindow, isDebugPage, isAuthPage, loading, isAuthenticated, router])

  useEffect(() => {
    if (isBareWindow) return
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
  }, [loading, isAuthenticated, isAuthPage, isDebugPage, isElectronRuntime, electronLoginPath, router, isBareWindow])

  useEffect(() => {
    if (isBareWindow) return
    document.title = getDocumentTitle(pathname)
  }, [pathname, isBareWindow])

  useEffect(() => {
    if (isBareWindow) return
    const api = (window as any).api
    const isChromelessPage = isAuthPage || isOnboardingPage
    void api?.sharedState?.patch?.({
      titleBarVisible: !isChromelessPage,
      isOnboarding: isChromelessPage,
    })
  }, [isAuthPage, isOnboardingPage, isBareWindow])

  if (isBareWindow) {
    return <>{children}</>
  }

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
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  if (isOnboardingPage) {
    if (onboardingStatus === 'unknown') return null
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  if (onboardingStatus !== 'completed') {
    return null
  }

  return (
    <SharedStateProvider>
      <ElectronClientLayout>{children}</ElectronClientLayout>
    </SharedStateProvider>
  )
}
