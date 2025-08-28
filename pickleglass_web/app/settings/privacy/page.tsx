'use client'

import { ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PrivacySettingsPage() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  if (loading || !userInfo) {
    return null
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
                  tab.id === 'privacy'
                    ? 'border-[#9ca3af] text-white'
                    : 'border-transparent text-white hover:text-[#9ca3af] hover:border-[#9ca3af]'
                }`}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-lg p-6 flex flex-col" style={{ background: '#262626', color: '#E0E0E0', border: '1px solid #3a3a4a' }}>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-white mb-3">Politique de confidentialité</h3>
              <p className="text-[#E0E0E0] text-sm leading-relaxed">
                Comprenez comment nous collectons, utilisons et protégeons vos informations personnelles.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => window.open('https://www.pickle.com/ko/privacy-policy', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-[#303030] hover:bg-[#444] text-white rounded-md text-sm font-medium transition-colors"
              >
                Confidentialité
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-lg p-6 flex flex-col" style={{ background: '#262626', color: '#E0E0E0', border: '1px solid #3a3a4a' }}>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-white mb-3">Conditions d’utilisation</h3>
              <p className="text-[#E0E0E0] text-sm leading-relaxed">
                Comprenez vos droits et responsabilités lors de l’utilisation de notre plateforme.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => window.open('https://www.pickle.com/ko/terms-of-service', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-[#303030] hover:bg-[#444] text-white rounded-md text-sm font-medium transition-colors"
              >
                Conditions
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 