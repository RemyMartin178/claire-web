'use client'

import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PrivacySettingsPage() {
  const tabs = [
    { id: 'profile', name: 'Profil personnel', href: '/settings' },
    { id: 'security', name: 'Sécurité', href: '/settings/security' },
    { id: 'privacy', name: 'Données et confidentialité', href: '/settings/privacy' },
    { id: 'billing', name: 'Facturation', href: '/settings/billing' },
  ]

  return (
    <Page>
      <div className="mb-6">
        <p className="text-xs text-gray-600 mb-1">Paramètres</p>
        <h1 className="text-3xl font-heading font-semibold text-[#282828]">Paramètres personnels</h1>
      </div>
      
      <div className="mb-8">
        <nav className="flex space-x-10 border-b border-gray-200">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                tab.id === 'privacy'
                  ? 'border-primary text-[#282828]'
                  : 'border-transparent text-gray-600 hover:text-[#282828] hover:border-gray-300'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex-grow">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-3">Politique de confidentialité</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprenez comment nous collectons, utilisons et protégeons vos informations personnelles.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => window.open('https://www.pickle.com/ko/privacy-policy', '_blank')}
                variant="outline"
                className="gap-2"
              >
                Confidentialité
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex-grow">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-3">Conditions d'utilisation</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprenez vos droits et responsabilités lors de l'utilisation de notre plateforme.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => window.open('https://www.pickle.com/ko/terms-of-service', '_blank')}
                variant="outline"
                className="gap-2"
              >
                Conditions
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
