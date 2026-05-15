'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'
import SettingsModalElectron from '@/components/SettingsModalElectron'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import { Search, ArrowLeft, ArrowRight } from 'lucide-react'

const isWindows =
  typeof window !== 'undefined' &&
  (window as any).api?.platform?.isWindows === true

export default function ElectronClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: userInfo } = useAuth()
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const refresh = async () => {
      const api = (window as any).api
      setCanGoBack(await api?.nav?.canGoBack?.() ?? false)
      setCanGoForward(await api?.nav?.canGoForward?.() ?? false)
    }
    refresh()
    const id = setInterval(refresh, 400)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handle = () => setSettingsOpen(true)
    window.addEventListener('claire:open-settings', handle)
    return () => window.removeEventListener('claire:open-settings', handle)
  }, [])

  // Listen for "navigate to session" events fired by main process when
  // a recording session ends — auto-route to the session details page.
  useEffect(() => {
    const api = (window as any).api
    const onNavigate = api?.dashboard?.onNavigateToSession
    const offNavigate = api?.dashboard?.removeOnNavigateToSession
    if (typeof onNavigate !== 'function') return

    onNavigate((data: { sessionId?: string } | undefined) => {
      const id = data?.sessionId
      if (typeof id === 'string' && id.length > 0) {
        router.push(`/activity/details?sessionId=${id}&new=1`)
      }
    })

    return () => {
      try { offNavigate?.() } catch { /* noop */ }
    }
  }, [router])

  const pathname = usePathname()
  const isOnboarding = pathname?.startsWith('/onboarding')
  const isAtRoot = pathname === '/' || pathname === '/activity'

  const getUserDisplayName = () => {
    if (!userInfo) return 'I'
    if (userInfo.display_name) return userInfo.display_name
    if (userInfo.email) return userInfo.email.split('@')[0]
    return 'U'
  }

  return (
    <div className="relative h-screen bg-background text-foreground">
      <div className="flex h-full flex-col bg-[#f7f7f8] dark:bg-[#18181b]">
      {!isOnboarding && (
        <header
          className="app-region-drag relative flex h-9 shrink-0 items-center px-4 z-[100]"
        >
          {/* Overlay blur quand settings ouvert */}
          {settingsOpen && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-xl z-[150] pointer-events-none" />
          )}

          {/* Back / Forward — marginLeft 0 Windows, 60px Mac (traffic lights) */}
          <div className="app-region-no-drag flex items-center">
            <button
              aria-label="Go back"
              onClick={() => { void (window as any).api?.nav?.back?.() }}
              disabled={!canGoBack || isAtRoot}
              className="app-region-no-drag mt-[3px] inline-flex h-[21px] items-center gap-1 rounded-md px-1 text-foreground/75 text-sm transform-gpu transition-[color,opacity,transform] duration-180 ease-apple hover:bg-transparent hover:text-foreground active:bg-transparent active:scale-95 disabled:text-muted-foreground disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100"
              style={{ marginLeft: isWindows ? 0 : 60 } as CSSProperties}
            >
              <ArrowLeft className="size-[18px]" />
            </button>
            {canGoForward && (
              <button
                aria-label="Go forward"
                onClick={() => { void (window as any).api?.nav?.forward?.() }}
                className="app-region-no-drag mt-[3px] ml-1 inline-flex h-[21px] items-center gap-1 rounded-md px-1 text-foreground/75 text-sm transform-gpu transition-[color,opacity,transform] duration-180 ease-apple hover:bg-transparent hover:text-foreground active:bg-transparent active:scale-95"
              >
                <ArrowRight className="size-[18px]" />
              </button>
            )}
          </div>

          {/* Search bar — absolutely centered */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 mt-0.5 flex -translate-y-1/2 justify-center z-[160]">
            <div className="app-region-no-drag pointer-events-auto w-[45vw] max-w-[440px]">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex h-[30px] w-full items-center gap-1.5 rounded-lg bg-input/50 px-3 text-muted-foreground/70 text-sm transform-gpu transition-[background-color,color,box-shadow,transform] duration-180 ease-apple hover:bg-input/80 hover:text-muted-foreground hover:shadow-sm active:scale-[0.99]"
              >
                <Search className="mr-0.5 size-3 shrink-0" />
                <span className="truncate">Rechercher ou poser une question...</span>
              </button>
            </div>
          </div>

          {/* Avatar — ml-auto + marginRight (129px Windows, -11px Mac) */}
          <div
            className="app-region-no-drag mt-[3px] ml-auto flex items-center gap-2 z-[170]"
            style={{ marginRight: isWindows ? 'calc(-11px + 140px)' : '-11px' } as CSSProperties}
          >
            <button
              onClick={() => setSettingsOpen(true)}
              className="group inline-flex size-[30px] items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted text-muted-foreground text-xs font-medium outline-none transform-gpu transition-[background-color,border-color,box-shadow,transform] duration-180 ease-apple hover:bg-muted-foreground/15 hover:shadow-sm active:scale-95"
            >
              <Avatar name={getUserDisplayName()} size="sm" />
            </button>
          </div>
        </header>
      )}

      {/* Content box — rounded border */}
      <div className="min-h-0 flex-1 p-1">
        <div className="app-surface flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-white dark:bg-[#09090b]">
          <div className="flex h-full w-full flex-col overflow-auto no-scrollbar motion-safe:animate-page-enter">
            {children}
          </div>
        </div>
      </div>
      </div>

      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PasswordModal />

      <SettingsModalElectron
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSearchClick={() => {
          setSettingsOpen(false)
          setTimeout(() => setIsSearchOpen(true), 150)
        }}
      />
    </div>
  )
}
