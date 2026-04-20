'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'

const PAGE_TITLES: Record<string, string> = {
  activity: 'Activite',
  calendar: 'Calendrier',
  settings: 'Parametres',
  tools: 'Outils',
  help: 'Aide',
  'knowledge-base': 'Base de connaissances',
  chat: 'Chat',
}

function getTitle(pathname: string | null) {
  const segment = pathname?.split('/').filter(Boolean)[0] || ''
  return PAGE_TITLES[segment] || 'Claire'
}

function WinButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-black/5"
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
  const pathname = usePathname()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const pageTitle = useMemo(() => getTitle(pathname), [pathname])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f4] text-neutral-900">
      <div
        className="flex h-10 shrink-0 items-center border-b border-black/5 bg-white/95 px-3 backdrop-blur"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#111827]">
            {pageTitle}
          </p>
          <p className="truncate text-[11px] text-[#6b7280]">
            Dashboard web optimise pour Electron
          </p>
        </div>

        <div className="ml-3 flex items-center gap-1">
          <WinButton
            title="Reduire"
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

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-none border-0 bg-gray-100">
        <Sidebar onSearchClick={() => setIsSearchOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          <main className="relative flex h-full w-full flex-1 flex-col overflow-hidden border-l border-neutral-200 bg-background p-2 text-neutral-900">
            <div className="h-full w-full overflow-auto no-scrollbar px-2 py-4 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PasswordModal />
    </div>
  )
}
