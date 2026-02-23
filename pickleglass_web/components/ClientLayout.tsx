'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchPopup from '@/components/SearchPopup'
import PasswordModal from '@/components/PasswordModal'

// AuthProvider provided at root layout to ensure single provider instance

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)


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

  return (
    <div className="rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden h-screen">
      <Sidebar onSearchClick={() => setIsSearchOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <main className="p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-background flex flex-col flex-1 w-full h-full overflow-hidden text-neutral-900 dark:text-neutral-100 relative">
          <div className="h-full w-full overflow-auto no-scrollbar">
            {children}
          </div>
        </main>
      </div>
      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PasswordModal />
    </div>
  )
} 
