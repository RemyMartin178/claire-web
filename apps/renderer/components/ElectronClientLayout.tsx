'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'
import SettingsModalElectron from '@/components/SettingsModalElectron'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { Search } from 'lucide-react'

function WinButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-full text-[#9ca3af] transition hover:bg-black/5 hover:text-[#6b7280] disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent"
      style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
    >
      {children}
    </button>
  )
}

export default function ElectronClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: userInfo } = useAuth()
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

  const getUserDisplayName = () => {
    if (!userInfo) return 'I'
    if (userInfo.display_name) return userInfo.display_name
    if (userInfo.email) return userInfo.email.split('@')[0]
    return 'U'
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f4] text-neutral-900 relative">
      {/* Titlebar — back/forward | search | avatar + window controls */}
      <div
        className="flex h-11 shrink-0 items-center gap-2 border-b border-black/5 bg-white/95 px-2 backdrop-blur relative z-[200]"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        {/* Back / Forward */}
        <div className="flex items-center gap-0.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <WinButton
            title="Retour"
            onClick={() => { void (window as any).api?.nav?.back?.() }}
            disabled={!canGoBack}
          >
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
              <path d="M6 1L1.5 5.5L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </WinButton>
          <WinButton
            title="Suivant"
            onClick={() => { void (window as any).api?.nav?.forward?.() }}
            disabled={!canGoForward}
          >
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
              <path d="M1 1L5.5 5.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </WinButton>
        </div>

        {/* Search bar — centred */}
        <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 h-7 w-full max-w-sm px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-400 text-[13px] transition-colors"
          >
            <Search size={13} className="shrink-0" />
            <span>Rechercher dans vos conversations</span>
          </button>
        </div>

        {/* Avatar + window controls */}
        <div className="flex items-center gap-1.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-neutral-200 transition-all"
            title="Paramètres"
          >
            <Avatar name={getUserDisplayName()} size="sm" />
          </button>
          <WinButton
            title="Réduire"
            onClick={() => { void window.api?.dashboard?.minimizeWindow?.() }}
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
              <rect width="10" height="1.5" rx=".75" fill="currentColor" />
            </svg>
          </WinButton>
          <WinButton
            title="Agrandir"
            onClick={() => { void window.api?.dashboard?.maximizeWindow?.() }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x=".75" y=".75" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </WinButton>
          <WinButton
            title="Fermer"
            onClick={() => { void window.api?.dashboard?.closeWindow?.() }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </WinButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <main className="relative flex h-full w-full flex-1 flex-col overflow-hidden text-neutral-900">
          <div className="h-full w-full overflow-auto no-scrollbar px-2 py-4 md:px-8 md:py-8">
            {children}
          </div>
        </main>
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
