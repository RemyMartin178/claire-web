'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function BillingPage() {
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
                tab.id === 'billing'
                  ? 'border-primary text-[#282828]'
                  : 'border-transparent text-gray-600 hover:text-[#282828] hover:border-gray-300'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Plan Gratuit */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Gratuit</h3>
              <div className="text-3xl font-bold text-[#282828]">
                $0<span className="text-lg font-normal text-gray-600">/mois</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Découvrez comment Claire fonctionne avec des réponses illimitées.
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Réponses illimitées quotidiennes</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Accès illimité aux modèles gratuits</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Sortie de texte illimitée</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Visualisation écran, écoute audio</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Prompts système personnalisés</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Support communautaire uniquement</span>
              </li>
            </ul>
            
            <Button className="w-full" variant="outline" disabled>
              Plan actuel
            </Button>
          </CardContent>
        </Card>

        {/* Plan Pro */}
        <Card className="bg-white opacity-60">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Plus</h3>
              <div className="text-3xl font-bold text-[#282828]">
                $25<span className="text-lg font-normal text-gray-600">/mois</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Utilisez les derniers modèles et obtenez toutes les fonctionnalités avancées.
            </p>  
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Réponses pro illimitées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Accès illimité aux derniers modèles</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Accès complet au tableau de bord</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Support prioritaire</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Toutes les fonctionnalités du plan gratuit</span>
              </li>
            </ul>
            
            <Button className="w-full" variant="secondary" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>

        {/* Plan Enterprise */}
        <Card className="bg-white opacity-60 border-gray-300">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-heading font-semibold mb-2 text-[#282828]">Enterprise</h3>
              <div className="text-xl font-semibold text-[#282828]">Personnalisé</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Spécialement conçu pour les équipes nécessitant une personnalisation complète.
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Intégrations personnalisées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Provisionnement utilisateurs & accès basé sur les rôles</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Analyses avancées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Authentification unique (SSO)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Fonctionnalités de sécurité avancées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Facturation centralisée</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Analyses d'utilisation & tableaux de bord</span>
              </li>
            </ul>
            
            <Button className="w-full" variant="outline" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Message d'information */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-primary" />
            <div>
              <h4 className="font-heading font-semibold text-[#282828]">Toutes les fonctionnalités sont actuellement gratuites !</h4>
              <p className="text-gray-600 text-sm">
                Profitez de toutes les fonctionnalités de Claire gratuitement. Les plans Plus et Enterprise seront bientôt disponibles avec des fonctionnalités premium supplémentaires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Page>
  )
}
