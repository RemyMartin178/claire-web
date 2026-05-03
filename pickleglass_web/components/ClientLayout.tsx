'use client'

import { useState, useEffect } from 'react'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'
import SettingsModal from '@/components/SettingsModal'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'

// AuthProvider provided at root layout to ensure single provider instance

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: userInfo } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // tracking retiré

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getUserDisplayName = () => {
    if (!userInfo) return 'I';
    if (userInfo.display_name) return userInfo.display_name;
    if (userInfo.email) return userInfo.email.split('@')[0];
    return 'U';
  };

  return (
    <div className="flex flex-col bg-background w-full h-screen overflow-hidden relative text-neutral-900 dark:text-neutral-100">
      
      {/* Header Area with Top Right Avatar Trigger */}
      <header className="absolute top-4 right-4 md:top-6 md:right-6 flex justify-end z-40 pointer-events-none">
         <div className="pointer-events-auto">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-neutral-200 dark:hover:ring-neutral-700 transition-all shadow-sm"
              title="Ouvrir le menu"
            >
              <Avatar name={getUserDisplayName()} size="sm" />
            </button>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full overflow-hidden">
        <div className="h-full w-full overflow-auto no-scrollbar">
          {children}
        </div>
      </main>

      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PasswordModal />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSearchClick={() => {
          setIsSettingsOpen(false);
          setTimeout(() => setIsSearchOpen(true), 150);
        }}
      />
    </div>
  )
} 
