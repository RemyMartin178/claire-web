'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchPopup from '@/components/SearchPopup'
import { AuthProvider } from '@/contexts/AuthContext'

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
    <AuthProvider>
      <div className="flex h-screen">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={setIsSidebarCollapsed}
          onSearchClick={() => setIsSearchOpen(true)}
        />
        <main className="flex-1 overflow-auto" style={{ background: '#1E1E1E' }}>
          {children}
        </main>
        <SearchPopup
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </div>
    </AuthProvider>
  )
} 