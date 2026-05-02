'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'
import SettingsModal from '@/components/SettingsModal'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { X } from 'lucide-react'

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
    const handle = (e: Event) => {
      setSettingsOpen(true)
    }
    window.addEventListener('claire:open-settings', handle)
    return () => window.removeEventListener('claire:open-settings', handle)
  }, [])

  const getUserDisplayName = () => {
    if (!userInfo) return 'I';
    if (userInfo.display_name) return userInfo.display_name;
    if (userInfo.email) return userInfo.email.split('@')[0];
    return 'U';
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f4] text-neutral-900 relative">
      {/* Frameless drag bar — nav arrows left, window controls right */}
      <div
        className="flex h-8 shrink-0 items-center justify-between border-b border-black/5 bg-white/95 px-2 backdrop-blur relative z-50"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        {/* Back / Forward */}
        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
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

        {/* Window controls */}
        <div className="flex items-center gap-0.5">
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

      {/* Header Area with Top Right Avatar Trigger */}
      <header className="absolute top-8 right-0 p-4 md:p-6 flex justify-end z-40 pointer-events-none">
         <div className="pointer-events-auto">
            <button 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-neutral-200 dark:hover:ring-neutral-700 transition-all shadow-sm"
              title="Ouvrir le menu"
            >
              <Avatar name={getUserDisplayName()} size="sm" />
            </button>
         </div>
      </header>

      {/* Main Content Area filling the entire screen */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-none border-0 bg-background">
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

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        onSearchClick={() => {
          setSettingsOpen(false);
          setTimeout(() => setIsSearchOpen(true), 150);
        }}
      />
    </div>
  )
}
