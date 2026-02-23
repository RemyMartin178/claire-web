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
import { loadStripe } from '@stripe/stripe-js'
import { auth } from '@/utils/firebase'
import {
  trackBillingPageView,
  trackBillingCycleChanged,
  trackPlanClick,
  trackCheckoutStarted,
  trackPurchase,
  trackCheckoutAbandoned,
  trackManageSubscriptionClick,
  trackEnterpriseContactClick,
  trackUpgradeToAnnualClick,
  trackUpgradeToAnnualSuccess,
  trackUpgradeModalOpen,
  trackUpgradeModalDismissed,
} from '@/lib/gtag'

const waitForFirebaseUser = async (timeoutMs = 4000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (auth?.currentUser) return auth.currentUser
    await new Promise(r => setTimeout(r, 150))
  }
  return null
}

export default function BillingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradePreview, setUpgradePreview] = useState<any>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)

  // États séparés pour les sections mensuelle et annuelle
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [yearlyLoading, setYearlyLoading] = useState(false)

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

  // ── GA4: track billing page view on mount ────────────────────────────────
  useEffect(() => {
    if (!subscription.isLoading) {
      trackBillingPageView(subscription.plan || 'free')
    }
  }, [subscription.isLoading, subscription.plan])

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
      // GA4: track purchase
      const cycle = new URLSearchParams(window.location.search).get('cycle') as 'monthly' | 'yearly' || 'yearly'
      const priceEuros = cycle === 'monthly' ? 20 : 100
      trackPurchase('plus', cycle, priceEuros)
      setShowSuccess(true)

      // Important: subscription status can be cached for up to 5 minutes.
      // On a Stripe success redirect we must invalidate cache and (if possible) sync immediately.
      try {
        localStorage.removeItem('subscription_cache')
      } catch { }

      const sessionId = searchParams.get('session_id')
      if (sessionId) {
        ; (async () => {
          try {
            const u = await waitForFirebaseUser()
            if (!u) return
            const token = await u.getIdToken()
            await fetch('/api/stripe/sync-checkout-session', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ sessionId }),
            })
          } catch (e) {
            console.warn('Stripe sync-checkout-session failed:', e)
          }
        })()
      }

      // Fallback manual sync (when we only have a Stripe customer id)
      const customerId = searchParams.get('customer_id')
      if (!sessionId && customerId) {
        ; (async () => {
          try {
            const u = await waitForFirebaseUser()
            if (!u) return
            const token = await u.getIdToken()
            await fetch('/api/stripe/sync-customer', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ customerId }),
            })
          } catch (e) {
            console.warn('Stripe sync-customer failed:', e)
          }
        })()
      }

      // Nettoyer l'URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('session_id')
      url.searchParams.delete('customer_id')
      window.history.replaceState({}, '', url.toString())

      // Recharger la page après 3 secondes pour récupérer le nouveau statut
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }

    if (searchParams.get('canceled') === 'true') {
      console.log('Paiement annulé par l\'utilisateur')
      trackCheckoutAbandoned('plus', billingCycle)
    }
  }, [searchParams])

  // Fonction pour formater les montants
  const formatCents = (n?: number) => {
    const v = (n ?? 0) / 100
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
  }

  // Fonction pour gérer les clics dans la section mensuelle
  const handleMonthlyClick = () => {
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd

    if (isPlusActive) return

    trackPlanClick('plus', 'monthly')
    setMonthlyLoading(true)
    handleSubscribe('plus').finally(() => setMonthlyLoading(false))
  }

  // Fonction pour gérer les clics dans la section annuelle
  const handleYearlyClick = () => {
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd

    if (isPlusActive) {
      if (subscription.billingCycle === 'yearly') return

      if (subscription.billingCycle === 'monthly') {
        trackUpgradeToAnnualClick()
        setYearlyLoading(true)
        handleUpgradeToAnnual().finally(() => setYearlyLoading(false))
        return
      }
    }

    trackPlanClick('plus', 'yearly')
    setYearlyLoading(true)
    handleSubscribe('plus').finally(() => setYearlyLoading(false))
  }

  // Fonction pour déterminer le texte du bouton mensuel
  const getMonthlyButtonText = () => {
    if (subscription.isLoading) return 'Vérification...'
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd

    if (isPlusActive) {
      // Si on a déjà Plus actif (mensuel OU annuel), on verrouille le bouton mensuel
      return '✓ Plan actuel'
    }
    return monthlyLoading ? 'Chargement...' : 'Souscrire à Plus'
  }

  // Fonction pour déterminer le texte du bouton annuel
  const getYearlyButtonText = () => {
    if (subscription.isLoading) return 'Vérification...'
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd

    // Si l'utilisateur est déjà en Plus annuel actif, c'est le plan actuel
    if (isPlusActive && subscription.billingCycle === 'yearly') return '✓ Plan actuel'

    // Si l'utilisateur est en Plus mensuel actif, on propose de "Souscrire" à l'annuel
    // (cela déclenche l'upgrade mensuel -> annuel)
    if (isPlusActive && subscription.billingCycle === 'monthly') return 'Souscrire à Plus'

    return yearlyLoading ? 'Chargement...' : 'Souscrire à Plus'
  }

  // Fonction pour déterminer si le bouton mensuel est désactivé
  const isMonthlyButtonDisabled = () => {
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd

    return monthlyLoading || subscription.isLoading || upgradeLoading || isPlusActive
  }

  // Fonction pour déterminer si le bouton annuel est désactivé
  const isYearlyButtonDisabled = () => {
    const isPlusActive =
      subscription.plan === 'plus' && subscription.isActive && !subscription.cancelAtPeriodEnd
    const isPlusYearly = isPlusActive && subscription.billingCycle === 'yearly'

    return yearlyLoading || subscription.isLoading || upgradeLoading || isPlusYearly
  }

  // Fonction pour gérer l'upgrade vers annuel
  const handleUpgradeToAnnual = async () => {
    if (subscription.plan !== 'plus' || !subscription.isActive || subscription.cancelAtPeriodEnd || !subscription.stripeSubscriptionId) {
      return
    }

    if (subscription.billingCycle === 'yearly') {
      alert('Vous êtes déjà sur le plan annuel')
      return
    }

    trackUpgradeModalOpen('monthly')
    setPaymentModalOpen(true)

    // Si on a déjà calculé la proration dans cette session, ne pas recalculer
    if (upgradePreview && paymentMethod) {
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      const customerId = typeof subscription.stripeCustomerId === 'object' ? subscription.stripeCustomerId.id : subscription.stripeCustomerId
      const subscriptionId = subscription.stripeSubscriptionId
      // Récupérer le preview de proration
      const previewRes = await fetch('/api/billing/preview-upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
        }),
      })

      const previewJson = await previewRes.json()
      if (!previewRes.ok) throw new Error(previewJson.error || 'preview_failed')
      setUpgradePreview(previewJson)

      // Récupérer la méthode de paiement par défaut
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (!stripe) throw new Error('Stripe not loaded')

      // Récupérer les méthodes de paiement du client
      const paymentMethodsRes = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })

      const paymentMethodsData = await paymentMethodsRes.json()
      if (!paymentMethodsRes.ok) throw new Error(paymentMethodsData.error || 'Failed to get payment methods')

      setPaymentMethod(paymentMethodsData.paymentMethod)
    } catch (e: any) {
      setPaymentError(e.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  // Fonction pour confirmer le paiement direct
  const confirmDirectPayment = async () => {
    setPaymentLoading(true)
    setPaymentError(null)

    try {
      const customerId = typeof subscription.stripeCustomerId === 'object' ? subscription.stripeCustomerId.id : subscription.stripeCustomerId
      const subscriptionId = subscription.stripeSubscriptionId
      const res = await fetch('/api/billing/confirm-upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'upgrade_failed')

      // Si un paiement est requis, confirmer avec Stripe
      if (json.paymentIntentClientSecret) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        if (!stripe) throw new Error('Stripe not loaded')

        const { error } = await stripe.confirmCardPayment(json.paymentIntentClientSecret)
        if (error) throw new Error(error.message)
      }

      setUpgradeSuccess(true)
      setPaymentModalOpen(false)
      trackUpgradeToAnnualSuccess()

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (e: any) {
      setPaymentError(e.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  // Fonction pour confirmer l'upgrade
  const confirmUpgrade = async () => {
    setUpgradeLoading(true)
    setUpgradeError(null)

    try {
      const customerId = typeof subscription.stripeCustomerId === 'object' ? subscription.stripeCustomerId.id : subscription.stripeCustomerId
      const subscriptionId = subscription.stripeSubscriptionId
      const res = await fetch('/api/billing/confirm-upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'upgrade_failed')

      // Si un payment intent nécessite une confirmation
      if (json.paymentIntentClientSecret) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        if (!stripe) throw new Error('stripe_js_failed')
        const { error: confirmErr } = await stripe.confirmCardPayment(json.paymentIntentClientSecret)
        if (confirmErr) throw confirmErr
      }

      setUpgradeSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (e: any) {
      setUpgradeError(e.message)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) {
      alert('Vous devez être connecté')
      return
    }

    trackManageSubscriptionClick()
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
      console.log('Raw customerId:', customerId, 'Type:', typeof customerId)

      // Si c'est un objet, extraire l'ID
      if (customerId && typeof customerId === 'object') {
        console.log('CustomerId is object, keys:', Object.keys(customerId))
        if (customerId.id) {
          customerId = customerId.id
          console.log('Extracted ID from object:', customerId)
        } else {
          console.error('No id property found in customer object:', customerId)
          throw new Error('Format de customer ID invalide - pas de propriété id')
        }
      }

      // Vérifier que c'est bien une string valide
      if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
        console.error('Invalid customerId after extraction:', customerId)
        throw new Error('Customer ID invalide après extraction')
      }

      console.log('Final customer ID to use:', customerId, 'Type:', typeof customerId)

      // Vérification finale avant envoi
      if (typeof customerId !== 'string') {
        console.error('Customer ID is not a string before sending:', customerId)
        throw new Error('Customer ID doit être une string avant envoi')
      }

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
        priceId = billingCycle === 'monthly'
          ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
      } else {
        trackEnterpriseContactClick()
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
        // Track checkout started before Stripe redirect
        const priceEuros = billingCycle === 'monthly' ? 20 : 100
        trackCheckoutStarted(plan, billingCycle, priceEuros)
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
              className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${tab.id === 'billing'
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
              className={`absolute top-1 bottom-1 rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out ${billingCycle === 'monthly'
                ? 'left-1 w-[calc(50%-4px)]'
                : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
                }`}
            />

            <button
              onClick={() => { setBillingCycle('monthly'); trackBillingCycleChanged('monthly') }}
              className={`px-6 py-2 rounded-2xl text-sm font-medium transition-colors duration-300 relative z-10 ${billingCycle === 'monthly'
                ? 'text-[#282828]'
                : 'text-gray-600 hover:text-[#282828]'
                }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => { setBillingCycle('yearly'); trackBillingCycleChanged('yearly') }}
              className={`px-6 py-2 rounded-2xl text-sm font-medium transition-colors duration-300 relative z-10 ${billingCycle === 'yearly'
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
        <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors flex flex-col">
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
        <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors border-primary border-2 flex flex-col">
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
                onClick={billingCycle === 'monthly' ? handleMonthlyClick : handleYearlyClick}
                disabled={billingCycle === 'monthly' ? isMonthlyButtonDisabled() : isYearlyButtonDisabled()}
              >
                {billingCycle === 'monthly' ? getMonthlyButtonText() : getYearlyButtonText()}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Enterprise */}
        <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors border-gray-300 flex flex-col">
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

      {/* Modal d'upgrade vers annuel */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmer l'upgrade vers l'annuel
            </h3>

            {upgradeLoading && <p className="mt-3 text-sm opacity-70">Calcul de la proration…</p>}
            {upgradeError && <p className="mt-3 text-sm text-red-600">{upgradeError}</p>}

            {upgradePreview && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Crédit proration</span>
                  <span className="text-green-600">-{formatCents(upgradePreview.prorationCredit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ajustement</span>
                  <span>{formatCents(upgradePreview.newCharge)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>À payer maintenant</span>
                  <span>{formatCents(upgradePreview.amountDue)}</span>
                </div>
                <p className="mt-2 text-xs opacity-70">
                  L'annuel remplace le mensuel immédiatement. La différence est calculée au prorata.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                disabled={upgradeLoading}
              >
                Annuler
              </button>
              <button
                onClick={confirmUpgrade}
                className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50"
                disabled={upgradeLoading || !!upgradeError}
              >
                {upgradeSuccess ? 'Fait ✅' : upgradeLoading ? 'Traitement…' : 'Confirmer l\'upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de paiement direct */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Confirmer les changements de forfait
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {paymentLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-8 h-8 mb-3">
                  <div className="absolute top-0 left-0 w-full h-full border-2 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-600">Veuillez patienter...</p>
              </div>
            ) : paymentError ? (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                ❌ {paymentError}
              </div>
            ) : upgradePreview ? (
              <div className="space-y-3">
                {/* Abonnement Claire Plus */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Abonnement Claire Plus</p>
                    <p className="text-xs text-gray-500">Facturé annuellement, à partir d'aujourd'hui</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCents(upgradePreview.newCharge)}</p>
                </div>

                {/* Ajustement */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Ajustement</p>
                    <p className="text-xs text-gray-500">Crédit au prorata pour le reste de votre abonnement plus</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">-{formatCents(upgradePreview.prorationCredit)}</p>
                </div>

                {/* Sous-total */}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-900">Sous-total</p>
                  <p className="text-sm font-medium text-gray-900">{formatCents(upgradePreview.amountDue)}</p>
                </div>

                {/* Taxes */}
                <div className="flex justify-between">
                  <p className="text-sm text-gray-900">Taxes<span className="text-xs text-gray-500">20 %</span></p>
                  <p className="text-sm font-medium text-gray-900">{formatCents(Math.round(upgradePreview.amountDue * 0.2))}</p>
                </div>

                {/* Total dû aujourd'hui */}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">Total dû aujourd'hui</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCents(Math.round(upgradePreview.amountDue * 1.2))}</p>
                </div>

                {/* Mode de paiement */}
                {paymentMethod && (
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">Mode de paiement</p>
                    <p className="text-sm text-gray-900">
                      {paymentMethod.card?.brand?.toUpperCase()} *{paymentMethod.card?.last4}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {!paymentLoading && (
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={paymentLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDirectPayment}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={paymentLoading || !!paymentError || !upgradePreview}
                >
                  Payer maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}

