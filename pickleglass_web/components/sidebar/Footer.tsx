'use client'

import { Settings, HelpCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'
import clsx from 'clsx'

export function Footer() {
  const { user } = useAuth()

  const getUserInitials = () => {
    if (!user) return 'U'
    const name = user.display_name || user.email || 'User'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getUserName = () => {
    if (!user) return 'Utilisateur'
    return user.display_name || user.email?.split('@')[0] || 'Utilisateur'
  }

  return (
    <div className="px-2 py-2 border-t" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-elevated-secondary)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar
            name={user ? (user.display_name || user.email || 'EXPANDED') : 'EXPANDED'}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {getUserName()}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              Claire Gratuit
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            className="p-2 rounded-md transition-all duration-150"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-md transition-all duration-150"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Aide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-md transition-all duration-150"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Menu utilisateur"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
