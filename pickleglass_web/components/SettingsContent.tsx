'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { deleteAccount, updateUserProfile } from '@/utils/api'
import { auth } from '@/utils/firebase'
import { Check, ChevronDown, Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription'
import { gtagEvent } from '@/lib/gtag'
import { toast } from 'react-hot-toast'

export type Tab = 'profile' | 'billing' | 'security' | 'privacy'

export function SettingsContent({ activeTab }: { activeTab: Tab }) {
  const { user: userInfo } = useAuth()
  const subscription = useSubscription()
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const isGoogleUser = userInfo?.email?.includes('@gmail.com') || userInfo?.email?.includes('@google.com')

  useEffect(() => {
    if (userInfo?.display_name) setDisplayNameInput(userInfo.display_name)
  }, [userInfo])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowDeleteModal(false)
      }
    }
    if (showDeleteModal) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [showDeleteModal])

  const handleCancelSubscription = () => setShowCancelModal(true)

  const confirmCancelSubscription = async () => {
    try {
      if (subscription.cancelAtPeriodEnd) {
        setShowCancelModal(false)
        toast('Abonnement déjà annulé')
        return
      }
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Impossible de récupérer le token')
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
      let responseData: any
      try { responseData = await response.json() } catch { throw new Error('Erreur lors de la lecture de la réponse') }
      if (response.ok && responseData.success !== false) {
        gtagEvent('subscription_cancelled', { plan: subscription.plan, billing_cycle: subscription.billingCycle })
        setShowCancelModal(false)
        toast.success('Abonnement annulé')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        throw new Error(responseData?.error || "Erreur lors de l'annulation")
      }
    } catch (error: any) {
      const msg = error.message || "Erreur lors de l'annulation"
      if (msg.includes('déjà annulé')) {
        setShowCancelModal(false)
        toast('Abonnement déjà annulé')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error("Échec de l'annulation")
      }
    }
  }

  const handleManageSubscription = async () => {
    if (!userInfo) { toast.error('Connexion requise'); return }
    if (subscription.plan === 'free' || !subscription.isActive || !subscription.stripeSubscriptionId) {
      toast('Aucun abonnement'); return
    }
    setIsManagingSubscription(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Impossible de récupérer le token')
      const subResponse = await fetch('/api/user/subscription', { headers: { Authorization: `Bearer ${token}` } })
      if (!subResponse.ok) { toast.error('Portail indisponible'); return }
      const subData = await subResponse.json()
      if (!subData.subscription?.stripeCustomerId) { toast('Abonnement manuel'); return }
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerId: subData.subscription.stripeCustomerId, returnUrl: `${window.location.origin}/settings` }),
      })
      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors de l'ouverture du portail")
      }
    } catch {
      toast.error('Erreur portail')
    } finally {
      setIsManagingSubscription(false)
      setShowSubscriptionMenu(false)
    }
  }

  const handleUpgradeSubscription = () => {
    setShowSubscriptionMenu(false)
    window.location.replace('/settings/billing?billingCycle=yearly')
  }

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim()) return
    setIsSaving(true)
    try {
      await updateUserProfile({ displayName: displayNameInput.trim() })
      toast.success('Profil mis à jour')
    } catch {
      toast.error('Échec mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount()
      setShowDeleteModal(false)
      toast.success('Compte supprimé')
      setTimeout(() => { window.location.href = '/auth/login' }, 2000)
    } catch (error: any) {
      let msg = 'Erreur lors de la suppression du compte. Veuillez réessayer.'
      if (error.message.includes('requires-recent-login')) {
        msg = 'Pour des raisons de sécurité, veuillez vous reconnecter avant de supprimer votre compte.'
      } else if (error.message.includes('network')) {
        msg = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.'
      }
      setDeleteError(msg)
      toast.error('Échec de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  const renderSecurityContent = () => (
    <div className="space-y-6">
      <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
        <CardContent className="p-6">
          <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Mot de passe</h3>
          <p className="text-sm text-gray-600 mb-4">
            {isGoogleUser
              ? 'Ajoutez un mot de passe à votre compte Google pour une sécurité renforcée.'
              : 'Modifiez votre mot de passe pour sécuriser votre compte.'}
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <button type="button" className="btn-secondary">
              <span>{isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier le mot de passe'}</span>
            </button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
        <CardContent className="p-6">
          <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Appareils connectés</h3>
          <p className="text-sm text-gray-600 mb-4">Gérez les appareils connectés à votre compte.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-transparent rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-[#282828]">Cet appareil</p>
                  <p className="text-xs text-gray-500">Windows • Connecté maintenant</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Actuel</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <button type="button" className="btn-secondary" disabled>
              <span>Déconnecter tous les appareils</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderBillingContent = () => (
    <div className="space-y-6">
      <Card className="bg-transparent shadow-none border-primary/20 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-primary" />
            <div>
              <h4 className="font-heading font-semibold text-[#282828]">Toutes les fonctionnalités sont actuellement gratuites !</h4>
              <p className="text-gray-600 text-sm">
                Profitez de toutes les fonctionnalités de Claire gratuitement. Les plans Plus et Enterprise seront bientôt disponibles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'billing': return renderBillingContent()
      case 'security': return renderSecurityContent()
      case 'profile': return (
        <div className="space-y-6">
          <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Nom affiché</h3>
              <p className="text-sm text-gray-600 mb-4">Saisissez votre nom complet ou un nom d'affichage de votre choix.</p>
              <div className="max-w-sm">
                <Input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Saisir votre nom d'affichage"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  disabled={isSaving || !displayNameInput || displayNameInput === userInfo?.display_name}
                  className="rounded-full bg-[#1D1D1F] text-white text-[13px] font-medium px-5 py-2 hover:opacity-75 transition-opacity disabled:opacity-30"
                >
                  {isSaving ? 'Enregistrement…' : 'Mettre à jour'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Abonnement</h3>
              <p className="text-sm text-gray-600 mb-4">
                {subscription.isLoading ? 'Chargement...' : getSubscriptionDisplayName(subscription.plan)}
              </p>
              {(subscription.plan === 'plus' || subscription.plan === 'max' || subscription.plan === 'enterprise') && subscription.isActive && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Crown className="h-4 w-4 text-primary" />
                  <span>
                    {subscription.cancelAtPeriodEnd ? (
                      <>Votre abonnement prendra fin{subscription.renewalDate ? <span className="font-medium"> le {subscription.renewalDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span> : null}</>
                    ) : (
                      <>Renouvellement automatique{subscription.renewalDate ? <span className="font-medium"> le {subscription.renewalDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span> : null}</>
                    )}
                  </span>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
                    disabled={subscription.isLoading}
                    className="rounded-full border border-[#e5e5ea] bg-white text-[#1D1D1F] text-[13px] font-medium px-5 py-2 hover:bg-[#f5f5f7] transition-colors disabled:opacity-30 min-w-[110px]"
                  >
                    <span className="flex items-center justify-between w-full gap-2">
                      {subscription.isLoading ? 'Chargement...' : (
                        <>Gérer<ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSubscriptionMenu ? 'rotate-180' : ''}`} /></>
                      )}
                    </span>
                  </button>
                  <div className={`absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 transition-all duration-200 ${showSubscriptionMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                    <div className="py-1">
                      {subscription.plan !== 'free' && subscription.isActive && subscription.stripeSubscriptionId && !subscription.cancelAtPeriodEnd && (
                        <button onClick={handleCancelSubscription} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                          Annuler l'abonnement
                        </button>
                      )}
                      <button onClick={handleUpgradeSubscription} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                        Passer à un plan supérieur
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Paiement</h3>
              <p className="text-sm text-gray-600 mb-4">Gérez vos moyens de paiement et votre historique de facturation.</p>
              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={isManagingSubscription}
                  className="rounded-full border border-[#e5e5ea] bg-white text-[#1D1D1F] text-[13px] font-medium px-5 py-2 hover:bg-[#f5f5f7] transition-colors disabled:opacity-30"
                >
                  {isManagingSubscription ? 'Ouverture…' : 'Gérer'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Supprimer le compte</h3>
              <p className="text-sm text-gray-600 mb-4">Supprimez définitivement votre compte et tout le contenu. Cette action est irréversible.</p>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-full border border-red-100 bg-red-50 text-red-500 text-[13px] font-medium px-5 py-2 hover:opacity-75 transition-opacity"
                >
                  Supprimer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
      default: return renderBillingContent()
    }
  }

  return (
    <>
      {renderTabContent()}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4 text-[#282828]">Supprimer le compte définitivement</h2>
              <p className="text-sm text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et supprimera toutes vos données.
              </p>
              {deleteError && (
                <p className="text-red-600 text-xs bg-red-50 p-2 rounded-md border border-red-200 mb-4">{deleteError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-full border border-[#e5e5ea] bg-white text-[#1D1D1F] text-[13px] font-medium px-5 py-2 hover:bg-[#f5f5f7] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="rounded-full border border-red-100 bg-red-50 text-red-500 text-[13px] font-medium px-5 py-2 hover:opacity-75 transition-opacity disabled:opacity-30"
                >
                  {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Annuler l'abonnement</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler votre abonnement ? Votre abonnement restera actif jusqu'à la fin de la période de facturation
              {subscription.renewalDate ? ` le ${subscription.renewalDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-full border border-[#e5e5ea] bg-white text-[#1D1D1F] text-[13px] font-medium px-5 py-2 hover:bg-[#f5f5f7] transition-colors"
              >
                Garder l'abonnement
              </button>
              <button
                type="button"
                onClick={confirmCancelSubscription}
                className="rounded-full border border-red-100 bg-red-50 text-red-500 text-[13px] font-medium px-5 py-2 hover:opacity-75 transition-opacity"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
