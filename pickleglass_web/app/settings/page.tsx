'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { deleteAccount, updateUserProfile, getUserProfile } from '@/utils/api'
import { signOut } from '@/utils/auth'
import { Check, ChevronDown, Crown } from 'lucide-react'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription'

type Tab = 'profile' | 'billing' | 'security' | 'privacy'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  progress: number
}

export default function SettingsPage() {
  const { user: userInfo, loading } = useAuth()
  const subscription = useSubscription()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // États pour les modals
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // États pour les notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  // États pour la gestion d'abonnement
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  
  const modalRef = useRef<HTMLDivElement>(null)

  // Détection de l'utilisateur Google vs Email/MDP
  const isGoogleUser = userInfo?.email?.includes('@gmail.com') || userInfo?.email?.includes('@google.com')

  // Fonction pour gérer l'abonnement
  const handleManageSubscription = async () => {
    if (!userInfo) {
      alert('Vous devez être connecté')
      return
    }

    setIsManagingSubscription(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings`
        })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Erreur lors de l\'ouverture du portail')
      }
    } catch (error) {
      console.error('Erreur portail Stripe:', error)
      addNotification('Erreur lors de l\'ouverture du portail de gestion. Réessayez plus tard.', 'error')
    } finally {
      setIsManagingSubscription(false)
      setShowSubscriptionMenu(false)
    }
  }

  // Fonction pour aller à la page de facturation (avec facturation annuelle par défaut)
  const handleUpgradeSubscription = () => {
    // Fermer le menu d'abonnement
    setShowSubscriptionMenu(false)
    // Rediriger vers la page de facturation avec facturation annuelle par défaut
    window.location.replace('/settings/billing?billingCycle=yearly')
  }

  // Fonction pour ajouter une notification
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString()
    const newNotification: Notification = { id, message, type, progress: 100 }
    setNotifications(prev => [...prev, newNotification])
    
    // Attendre que l'élément soit rendu, puis ajouter l'animation d'entrée
    setTimeout(() => {
      const notificationElement = document.querySelector(`[data-notification-id="${id}"]`) as HTMLElement;
      if (notificationElement) {
        // S'assurer qu'il n'y a pas de conflit d'animations
        notificationElement.classList.remove('animate-slide-out-right');
        // Forcer un reflow pour garantir le démarrage de l'animation
        void notificationElement.getBoundingClientRect();
        notificationElement.classList.add('animate-slide-in-right');
      }
    }, 50)
    
    // Animation du compte à rebours
    const startTime = Date.now()
    const duration = 4000 // 4 secondes
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === id ? { ...n, progress: remaining } : n
        )
      )
      
      if (remaining > 0) {
        requestAnimationFrame(updateProgress)
      } else {
        // Supprimer la notification quand le compte à rebours est terminé
        const notificationElement = document.querySelector(`[data-notification-id="${id}"]`) as HTMLElement;
        if (notificationElement) {
          notificationElement.classList.remove('animate-slide-in-right');
          notificationElement.classList.add('animate-slide-out-right');
          
          // Supprimer après l'animation
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
          }, 300);
        } else {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }
      }
    }
    
    requestAnimationFrame(updateProgress)
  }

  // Fonction pour supprimer une notification
  const removeNotification = (id: string) => {
    // Ajouter l'animation de sortie
    const notificationElement = document.querySelector(`[data-notification-id="${id}"]`) as HTMLElement;
    if (notificationElement) {
      notificationElement.classList.remove('animate-slide-in-right');
      notificationElement.classList.add('animate-slide-out-right');
      
      // Supprimer après l'animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 300);
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }

  useEffect(() => {
    if (userInfo?.display_name) {
      setDisplayNameInput(userInfo.display_name)
    }
  }, [userInfo])

  // Gérer le clic en dehors du modal pour le fermer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowDeleteModal(false)
        setShowLogoutModal(false)
      }
    }

    if (showDeleteModal || showLogoutModal) {
      document.addEventListener('mousedown', handleClickOutside)
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [showDeleteModal, showLogoutModal])

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim()) return

    setIsSaving(true)
    try {
      await updateUserProfile({ displayName: displayNameInput.trim() })
      addNotification('Nom affiché mis à jour avec succès !', 'success')
    } catch (error) {
        console.error("Failed to update display name:", error);
        addNotification('Erreur lors de la mise à jour du nom affiché', 'error')
    } finally {
        setIsSaving(false);
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError('')
    
    try {
      await deleteAccount()
      setShowDeleteModal(false)
      
      // Afficher la notification de succès
      addNotification('Compte supprimé avec succès. Redirection...', 'success')
      
      // Rediriger après un court délai pour que l'utilisateur voie la notification
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch (error: any) {
      console.error("Failed to delete account:", error)
      
      // Afficher un message d'erreur plus clair à l'utilisateur
      let errorMessage = 'Erreur lors de la suppression du compte. Veuillez réessayer.';
      
      if (error.message.includes('requires-recent-login')) {
        errorMessage = 'Pour des raisons de sécurité, vous devez vous reconnecter avant de supprimer votre compte. Veuillez vous déconnecter et vous reconnecter, puis réessayer.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour supprimer ce compte.';
      }
      
      setDeleteError(errorMessage);
      addNotification(errorMessage, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Settings: Logging out user...')
      
      // Utiliser la fonction signOut qui gère tout
      await signOut()
      
      // La redirection est gérée dans signOut()
    } catch (error) {
      console.error('Settings: Error during logout:', error)
      // En cas d'erreur, rediriger quand même
      window.location.replace('/login')
    }
  }

  const renderSecurityContent = () => (
    <div className="space-y-6">
      {/* Mot de passe */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Mot de passe</h3>
          <p className="text-sm text-gray-600 mb-4">
            {isGoogleUser 
              ? 'Ajoutez un mot de passe à votre compte Google pour une sécurité renforcée.'
              : 'Modifiez votre mot de passe pour sécuriser votre compte.'
            }
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <Button variant="outline">
              {isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier le mot de passe'}
            </Button>
          </div>
        </CardContent>
      </Card>

       {/* Appareils connectés */}
       <Card className="bg-white">
         <CardContent className="p-6">
          <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Appareils connectés</h3>
          <p className="text-sm text-gray-600 mb-4">Gérez les appareils connectés à votre compte et surveillez l'activité de connexion.</p>
          
          <div className="space-y-4">
            {/* Appareil actuel */}
            <div className="flex items-center justify-between p-3 bg-subtle-bg rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-[#282828]">Cet appareil</p>
                  <p className="text-xs text-gray-500">Windows 10 • Chrome • Paris, France</p>
                  <p className="text-xs text-gray-500">IP: 192.168.1.100 • Connecté maintenant</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Actuel</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <Button variant="outline" disabled>
              Déconnecter tous les appareils
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderBillingContent = () => (
    <div className="space-y-6">
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
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'billing':
        return renderBillingContent()
      case 'security':
        return renderSecurityContent()
      case 'profile':
        return (
           <div className="space-y-6">
             <Card className="bg-white">
               <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Nom affiché</h3>
                <p className="text-sm text-gray-600 mb-4">Saisissez votre nom complet ou un nom d'affichage de votre choix.</p>
                <div className="max-w-sm">
                  <Input
                    type="text"
                    id="display-name"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder="Saisir votre nom d'affichage"
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                  <Button
                    onClick={handleSaveDisplayName}
                    disabled={isSaving || !displayNameInput || displayNameInput === userInfo?.display_name}
                  >
                    Mettre à jour
                  </Button>
                </div>
              </CardContent>
             </Card>

             {/* Section Abonnement */}
             <Card className="bg-white">
               <CardContent className="p-6">
                 <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Abonnement</h3>
                 <p className="text-sm text-gray-600 mb-4">
                   {subscription.isLoading ? 'Chargement...' : getSubscriptionDisplayName(subscription.plan)}
                 </p>
                 
                 <div className="pt-4 border-t border-gray-200 mt-auto">
                   <div className="relative" data-subscription-menu>
                     <Button
                       variant="outline"
                       className="flex items-center gap-2 w-full"
                       onClick={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
                       disabled={subscription.isLoading}
                     >
                       {subscription.isLoading ? (
                         'Chargement...'
                       ) : (
                         <>
                           Gérer
                           <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSubscriptionMenu ? 'rotate-180' : ''}`} />
                         </>
                       )}
                     </Button>
                     
                     <div className={`absolute right-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 transition-all duration-200 ${
                       showSubscriptionMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                     }`}>
                       <div className="py-1">
                         <button
                           onClick={handleManageSubscription}
                           disabled={isManagingSubscription}
                           className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                         >
                           {isManagingSubscription ? 'Ouverture...' : 'Annuler l\'abonnement'}
                         </button>
                         <button
                           onClick={handleUpgradeSubscription}
                           className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                         >
                           Passer à un plan supérieur
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             <Card className="bg-white">
               <CardContent className="p-6">
                 <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Supprimer le compte</h3>
                <p className="text-sm text-gray-600 mb-4">Supprimez définitivement votre compte personnel et tout le contenu de la plateforme Claire. Cette action est irréversible, veuillez procéder avec précaution.</p>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    variant="destructive"
                  >
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case 'privacy':
        return null
      default:
        return renderBillingContent()
    }
  }

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

      {renderTabContent()}

      {/* Modal de suppression de compte */}
       {showDeleteModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <Card ref={modalRef} className="bg-white max-w-md w-full mx-4">
             <CardContent className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4 text-[#282828]">
                Supprimer le compte définitivement
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et supprimera toutes vos données (sessions, presets, profil).
              </p>
              
              {deleteError && (
                <p className="text-red-600 text-xs bg-red-50 p-2 rounded-md border border-red-200 mb-4">
                  {deleteError}
                </p>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  variant="destructive"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            data-notification-id={notification.id}
            className={`relative overflow-hidden rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-600'
                : notification.type === 'error'
                ? 'bg-red-600'
                : 'bg-primary'
            }`}
            style={{ transform: 'translateX(100%)', opacity: 0 }}
          >
            {/* Barre de progression */}
            <div 
              className="absolute top-0 left-0 h-1 bg-white transition-all duration-100 ease-linear"
              style={{ width: `${notification.progress}%` }}
            />
            
            {/* Contenu de la notification */}
            <div className="flex items-center justify-between p-3 text-white">
              <span className="text-sm font-medium">{notification.message}</span>
              <button 
                onClick={() => removeNotification(notification.id)} 
                className="ml-3 text-white hover:text-gray-200 transition-colors text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}
