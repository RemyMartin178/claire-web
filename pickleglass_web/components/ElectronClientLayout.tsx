'use client'

import { useState, type CSSProperties } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'

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
      className="flex h-7 w-7 items-center justify-center rounded-full text-[#9ca3af] transition hover:bg-black/5 hover:text-[#6b7280]"
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f4] text-neutral-900">
      {/* Minimal frameless drag bar — no title, just window controls */}
      <div
        className="flex h-8 shrink-0 items-center justify-end border-b border-black/5 bg-white/95 px-2 backdrop-blur"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
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
