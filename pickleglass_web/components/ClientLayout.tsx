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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={setIsSidebarCollapsed}
        onSearchClick={() => setIsSearchOpen(true)}
      />
      <main className="flex-1 overflow-auto" style={{ background: '#202123' }}>
        {children}
      </main>
      <SearchPopup
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PasswordModal />
    </div>
  )
} 
