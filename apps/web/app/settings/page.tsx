'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Page } from '@/components/Page'
import { SettingsContent, type Tab } from '@/components/SettingsContent'

const tabs = [
  { id: 'profile' as Tab, name: 'Profil personnel', href: '/settings' },
  { id: 'personalize' as Tab, name: 'Personnalisation', href: '/settings/personalize' },
  { id: 'security' as Tab, name: 'Sécurité', href: '/settings/security' },
  { id: 'privacy' as Tab, name: 'Données et confidentialité', href: '/settings/privacy' },
  { id: 'billing' as Tab, name: 'Facturation', href: '/settings/billing' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

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
                activeTab === tab.id
                  ? 'border-primary text-[#282828]'
                  : 'border-transparent text-gray-600 hover:text-[#282828] hover:border-gray-300'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <SettingsContent activeTab={activeTab} />
    </Page>
  )
}
