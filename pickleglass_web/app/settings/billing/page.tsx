'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/utils/auth'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function BillingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  
  const tabs = [
    { id: 'profile', name: 'Profil personnel', href: '/settings' },
    { id: 'security', name: 'Sécurité', href: '/settings/security' },
    { id: 'privacy', name: 'Données et confidentialité', href: '/settings/privacy' },
    { id: 'billing', name: 'Facturation', href: '/settings/billing' },
  ]

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    // Clear any saved return URL when landing on billing page
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('stripe_return_url')
    }

    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
    
    if (searchParams.get('canceled') === 'true') {
      // Optionally show a cancel message
      console.log('Paiement annulé par l\'utilisateur')
    }
  }, [searchParams])

  const handleSubscribe = async (plan: 'plus' | 'enterprise') => {
    if (!user) {
      alert('Vous devez être connecté pour souscrire')
      return
    }

    setIsLoading(plan)

    try {
      let priceId: string | undefined
      
      if (plan === 'plus') {
        // Utiliser le Price ID selon le cycle de facturation
        priceId = billingCycle === 'monthly' 
          ? 'price_1SHN9sAjfdK87nxfDtC0syHP'  // Plan mensuel 20€
          : 'price_1SHPkyAjfdK87nxfg27fDQvI'  // Plan annuel 100€
      } else {
        // Plan Enterprise - redirection vers email (pas de Stripe)
        window.location.href = 'mailto:contact@clairia.app?subject=Claire Enterprise - Demande de devis'
        return
      }

      if (!priceId) {
        console.error('Stripe Price ID manquant:', {
          plan,
          billingCycle,
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Présent' : 'Manquant'
        })
        throw new Error('Configuration Stripe incomplète. La clé publique Stripe doit être configurée.')
      }

      const userId = 'uid' in user ? user.uid : user.id
      const userEmail = 'email' in user ? user.email : null

      // Sauvegarder la page actuelle pour y revenir après login si nécessaire
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('stripe_return_url', '/settings/billing')
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId,
          userEmail,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(`Erreur lors de l'ouverture du paiement: ${error.message}`)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <Page>
      {/* Success notification */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center success-pulse">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-800">Abonnement activé !</h3>
              <p className="text-sm text-green-700">Votre abonnement Claire est maintenant actif.</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Toggle Mensuel/Annuel */}
      <div className="mb-8">
        <div className="flex justify-center">
          <div className="bg-gray-100 rounded-3xl p-1 flex relative">
            {/* Indicateur glissant */}
            <div 
              className={`absolute top-1 bottom-1 rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out ${
                billingCycle === 'monthly' 
                  ? 'left-1 w-[calc(50%-4px)]' 
                  : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
              }`}
            />
            
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-2xl text-sm font-medium transition-colors duration-300 relative z-10 ${
                billingCycle === 'monthly'
                  ? 'text-[#282828]'
                  : 'text-gray-600 hover:text-[#282828]'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-2xl text-sm font-medium transition-colors duration-300 relative z-10 ${
                billingCycle === 'yearly'
                  ? 'text-[#282828]'
                  : 'text-gray-600 hover:text-[#282828]'
              }`}
            >
              Annuel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Plan Gratuit */}
        <Card className="bg-white flex flex-col">
          <CardContent className="p-6 flex flex-col flex-1">
            <div className="mb-6">
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Gratuit</h3>
              <div className="text-3xl font-bold text-[#282828]">
                $0<span className="text-lg font-normal text-gray-600">/{billingCycle === 'monthly' ? 'mois' : 'an'}</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Goûtez à Claire avec quelques réponses gratuites pour commencer.
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">5 réponses pro par jour</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Accès illimité aux modèles gratuits</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Limite de 100 caractères en sortie</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Voit votre écran, entend votre audio</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Prompt système personnalisé</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Support communautaire uniquement</span>
              </li>
            </ul>
            
            <div className="pt-4 border-t border-gray-200 mt-auto">
              <Button className="w-full" variant="outline" disabled>
                Plan actuel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Pro */}
        <Card className="bg-white border-primary border-2 flex flex-col">
          <CardContent className="p-6 flex flex-col flex-1">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Plus</h3>
                <div className="text-3xl font-bold text-[#282828]">
                  {billingCycle === 'monthly' ? '20€' : '100€'}
                  <span className="text-lg font-normal text-gray-600">
                    /{billingCycle === 'monthly' ? 'mois' : 'an'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Utilisez les derniers modèles, obtenez une sortie complète et jouez avec vos propres prompts personnalisés.
            </p>  
            
            <ul className="space-y-3 mb-6">
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
                <span className="text-sm text-gray-700">Accès complet au tableau de bord des conversations</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Résumés avancés post-appel</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Support prioritaire</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Plus tout ce qui est inclus dans le plan gratuit</span>
              </li>
            </ul>
            
            <div className="pt-4 border-t border-gray-200 mt-auto">
              <Button 
                className="w-full bg-primary text-white hover:bg-primary/90" 
                onClick={() => handleSubscribe('plus')}
                disabled={isLoading !== null}
              >
                {isLoading === 'plus' ? 'Chargement...' : 'Souscrire à Plus'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Enterprise */}
        <Card className="bg-white border-gray-300 flex flex-col">
          <CardContent className="p-6 flex flex-col flex-1">
            <div className="mb-6">
              <h3 className="text-xl font-heading font-semibold mb-2 text-[#282828]">Enterprise</h3>
              <div className="text-xl font-semibold text-[#282828]">Personnalisé</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Spécialement conçu pour les équipes qui ont besoin d'une personnalisation complète.
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Intégrations personnalisées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Provisionnement d'utilisateurs & accès basé sur les rôles</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Analyses avancées post-appel</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Authentification unique (SSO)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Fonctionnalités de sécurité avancées</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Facturation centralisée</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-700">Tableaux de bord d'analyse d'utilisation & rapports</span>
              </li>
            </ul>
            
            <div className="pt-4 border-t border-gray-200 mt-auto">
              <Button 
                className="w-full text-[#374151] border-gray-300 hover:bg-gray-50" 
                variant="outline"
                onClick={() => window.location.href = 'mailto:contact@clairia.app?subject=Claire Enterprise - Demande de devis'}
              >
                Nous contacter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section d'aide */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-2">
          Besoin d'aide pour choisir ?
        </p>
        <p className="text-sm text-gray-600">
          Contactez notre{' '}
          <a 
            href="mailto:contact@clairia.app?subject=Claire - Aide au choix de plan"
            className="text-primary hover:text-primary/80 underline"
          >
            équipe commerciale
          </a>
          {' '}pour une recommandation personnalisée basée sur vos besoins.
        </p>
      </div>
    </Page>
  )
}
