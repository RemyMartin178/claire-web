'use client'

import { useState } from 'react'
import { SimpleSidebar } from './sidebar/SimpleSidebar'

export default function SidebarToggle() {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div className="flex">
      <SimpleSidebar isOpen={isOpen} />
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed top-3 left-[calc(var(--sidebar-rail-width)+8px)] z-20 h-9 px-3 rounded-lg border bg-[var(--sidebar-bg)] hover:bg-[var(--surface-hover)]"
        style={{ borderColor: 'var(--sidebar-border)' }}
        aria-label={isOpen ? 'Réduire la barre latérale' : 'Développer la barre latérale'}
        title={isOpen ? 'Réduire la barre latérale' : 'Développer la barre latérale'}
      >
        {isOpen ? '⟨⟨' : '⟩⟩'}
      </button>
    </div>
  )
}


