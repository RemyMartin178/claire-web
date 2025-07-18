'use client'

import { useRedirectIfNotAuth } from '@/utils/auth'

export default function BillingPage() {
  const userInfo = useRedirectIfNotAuth()

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', name: 'Profil personnel', href: '/settings' },
    { id: 'privacy', name: 'Données et confidentialité', href: '/settings/privacy' },
    { id: 'billing', name: 'Facturation', href: '/settings/billing' },
  ]

  return (
    <div className="bg-transparent min-h-screen text-white">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-white mb-1">Paramètres</p>
          <h1 className="text-3xl font-bold text-white">Paramètres personnels</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  tab.id === 'billing'
                    ? 'border-accent-light text-white'
                    : 'border-transparent text-white hover:text-accent-light hover:border-accent-light'
                }`}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center h-96">
          <h2 className="text-8xl font-black bg-gradient-to-r from-black to-gray-500 bg-clip-text text-transparent">
            Gratuit pour l’instant
          </h2>
        </div>
      </div>
    </div>
  )
} 