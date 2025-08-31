'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function BillingPage() {
  const { user: userInfo, loading } = useAuth();

  // Afficher un loader pendant le chargement au lieu de rediriger
  if (loading) {
    return (
      <div className="bg-transparent min-h-screen text-white animate-fade-in">
        <div className="px-8 py-8">
          <div className="mb-6">
            <p className="text-xs text-white mb-1">Paramètres</p>
            <h1 className="text-3xl font-bold text-white">Paramètres personnels</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
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
    <div className="bg-transparent min-h-screen text-white animate-fade-in">
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
                    ? 'border-[#9ca3af] text-white'
                    : 'border-transparent text-white hover:text-[#9ca3af] hover:border-[#9ca3af]'
                }`}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center h-96">
          <h2 className="text-8xl font-black bg-gradient-to-r from-black to-gray-500 bg-clip-text text-transparent">
            Gratuit pour l&apos;instant
          </h2>
        </div>
      </div>
    </div>
  )
} 
