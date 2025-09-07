'use client'

import { Settings, HelpCircle, ChevronDown, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function Footer() {
  const { user, isAuthenticated } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const getUserInitials = () => {
    if (!user) return 'U'
    const name = user.display_name || user.email || 'User'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getUserName = () => {
    if (!user) return 'Utilisateur'
    return user.display_name || user.email?.split('@')[0] || 'Utilisateur'
  }

  const getUserEmail = () => {
    if (!user) return 'Non connecté'
    return user.email || 'Email non disponible'
  }

  const handleAuthAction = async () => {
    if (isAuthenticated && user) {
      // Déconnexion
      try {
        // Supprimer les données de session
        sessionStorage.setItem('manuallyLoggedOut', 'true')
        // Rediriger vers la page d'accueil (le contexte d'auth se chargera de la déconnexion)
        router.push('/')
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error)
      }
    } else {
      // Connexion
      router.push('/auth/login')
    }
    setIsMenuOpen(false)
  }

  const handleSettingsClick = () => {
    router.push('/settings')
    setIsMenuOpen(false)
  }

  const handleHelpClick = () => {
    router.push('/help')
    setIsMenuOpen(false)
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
              {getUserEmail()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={handleSettingsClick}
            className="p-2 rounded-md transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleHelpClick}
            className="p-2 rounded-md transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Aide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={clsx(
              "p-2 rounded-md transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-700",
              isMenuOpen && "bg-gray-100 dark:bg-gray-700"
            )}
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Menu utilisateur"
          >
            <ChevronDown className={clsx(
              "w-4 h-4 transition-transform duration-200",
              isMenuOpen && "rotate-180"
            )} />
          </button>
        </div>
      </div>

      {/* Menu déroulant */}
      {isMenuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-2">
          <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
            style={{
              backgroundColor: 'var(--bg-elevated-primary)',
              borderColor: 'var(--card-border)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Informations utilisateur */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {getUserName()}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {getUserEmail()}
              </div>
            </div>

            {/* Options du menu */}
            <div className="py-1">
              <button
                onClick={handleSettingsClick}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-3"
                style={{ color: 'var(--text-primary)' }}
              >
                <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                Paramètres
              </button>

              <button
                onClick={handleHelpClick}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-3"
                style={{ color: 'var(--text-primary)' }}
              >
                <HelpCircle className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                Aide
              </button>

              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

              <button
                onClick={handleAuthAction}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-3"
                style={{
                  color: isAuthenticated ? '#ef4444' : 'var(--text-primary)',
                }}
              >
                {isAuthenticated ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
