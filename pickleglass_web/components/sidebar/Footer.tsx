'use client'

import { Settings, HelpCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {getUserName()}
            </div>
            <div className="text-xs text-gray-400">
              Claire
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Aide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Menu utilisateur"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
