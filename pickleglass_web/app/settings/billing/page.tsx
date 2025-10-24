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
import { useSubscription } from '@/hooks/useSubscription'

export default function BillingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  // Vérifier si on doit afficher la facturation mensuelle (par défaut = annuel)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const cycleParam = urlParams.get('billingCycle')
    if (cycleParam === 'monthly') {
      setBillingCycle('monthly')
    }
    // Par défaut, on reste sur 'yearly' (défini dans useState)
  }, [])
  const subscription = useSubscription()
  
  // Log pour debug
  useEffect(() => {
    console.log('Subscription status:', subscription)
  }, [subscription])
  
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
      
      // Nettoyer l'URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      
      // Recharger la page après 3 secondes pour récupérer le nouveau statut
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
    
    if (searchParams.get('canceled') === 'true') {
      console.log('Paiement annulé par l\'utilisateur')
    }
  }, [searchParams])

  const handleManageSubscription = async () => {
    if (!user) {
      alert('Vous devez être connecté')
      return
    }

    setIsLoading('manage')

    try {
      // Récupérer le customer ID depuis l'abonnement
      const subscriptionResponse = await fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${await (user as any).getIdToken()}`
        }
      })

      if (!subscriptionResponse.ok) {
        throw new Error('Impossible de récupérer les informations d\'abonnement')
      }

      const subscriptionData = await subscriptionResponse.json()
      console.log('Subscription data:', subscriptionData)
      
      // Extraire le customer ID (peut être un objet ou une string)
      let customerId = subscriptionData.subscription?.stripeCustomerId
      
      // Si c'est un objet, extraire l'ID
      if (customerId && typeof customerId === 'object' && customerId.id) {
        customerId = customerId.id
      }

      if (!customerId) {
        throw new Error('Aucun abonnement trouvé. Veuillez d\'abord souscrire à un plan.')
      }

      console.log('Customer ID to use:', customerId)

      // Rediriger vers le portail client Stripe
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          returnUrl: `${window.location.origin}/settings/billing`
        })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'ouverture du portail')
      }
    } catch (error: any) {
      console.error('Erreur portail Stripe:', error)
      alert(`Erreur lors de l'ouverture du portail de gestion: ${error.message}`)
    } finally {
      setIsLoading(null)
    }
  }

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
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 success-pulse">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-heading font-bold text-[#282828] mb-2">
                🎉 Paiement réussi !
              </h2>
              
              <p className="text-gray-600 mb-6">
                Votre abonnement <strong>Claire Plus</strong> est maintenant actif.
                Profitez de toutes les fonctionnalités Premium !
              </p>
              
              <div className="text-sm text-gray-500">
                Rechargement automatique dans 3 secondes...
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs text-gray-600 mb-1">Paramètres</p>
        <h1 className="text-3xl font-heading font-semibold text-[#282828]">Compte</h1>
        
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
                0€<span className="text-lg font-normal text-gray-600">/{billingCycle === 'monthly' ? 'mois' : 'an'}</span>
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
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
              >
                {subscription.plan === 'free' ? '✓ Plan actuel' : 'Plan gratuit'}
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
                disabled={isLoading !== null || subscription.plan === 'plus' || subscription.isLoading}
              >
                {subscription.isLoading
                  ? 'Vérification...'
                  : subscription.plan === 'plus' 
                    ? '✓ Plan actuel' 
                    : isLoading === 'plus' 
                      ? 'Chargement...' 
                      : 'Souscrire à Plus'
                }
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

      {/* Section de gestion de l'abonnement existant */}
      {subscription.plan !== 'free' && subscription.isActive && (
        <div className="mt-8">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#282828] mb-2">
                    🎉 Abonnement {subscription.plan === 'plus' ? 'Plus' : 'Enterprise'} actif
                  </h3>
                  <p className="text-gray-600 mb-2">
                    Votre abonnement sera automatiquement renouvelé
                    {subscription.renewalDate ? (
                      <span className="font-medium">
                        {' '}le {subscription.renewalDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 ml-1">
                        (Date non disponible)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    Gérez vos paiements, téléchargez vos factures et modifiez votre abonnement
                  </p>
                </div>
                <Button
                  onClick={handleManageSubscription}
                  disabled={isLoading === 'manage'}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {isLoading === 'manage' ? 'Ouverture...' : 'Gérer l\'abonnement'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
