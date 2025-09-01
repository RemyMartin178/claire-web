'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { deleteAccount, updateUserProfile, getUserProfile } from '@/utils/api'
import { signOut } from '@/utils/auth'
import { Check } from 'lucide-react'

type Tab = 'profile' | 'billing' | 'security' | 'privacy'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  progress: number
}

export default function SettingsPage() {
  const { user: userInfo, loading } = useAuth()
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
  
  const modalRef = useRef<HTMLDivElement>(null)

  // Détection de l'utilisateur Google vs Email/MDP
  const isGoogleUser = userInfo?.email?.includes('@gmail.com') || userInfo?.email?.includes('@google.com')

  // Fonction pour ajouter une notification
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString()
    const newNotification: Notification = { id, message, type, progress: 100 }
    setNotifications(prev => [...prev, newNotification])
    
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
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    }
    
    requestAnimationFrame(updateProgress)
  }

  // Fonction pour supprimer une notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
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
      <div className="rounded-lg p-6 text-white" style={{ background: '#262626', border: '1px solid #3a3a4a' }}>
        <h3 className="text-lg font-semibold text-white mb-1">Mot de passe</h3>
        <p className="text-sm text-[#E0E0E0] mb-4">
          {isGoogleUser 
            ? 'Ajoutez un mot de passe à votre compte Google pour une sécurité renforcée.'
            : 'Modifiez votre mot de passe pour sécuriser votre compte.'
          }
        </p>
        <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
          <button
            className="px-4 py-2 border-none text-sm font-medium rounded-md shadow-sm text-white bg-[#303030] hover:bg-[#444] focus:outline-none"
          >
            {isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>

      {/* Appareils connectés */}
      <div className="rounded-lg p-6 text-white" style={{ background: '#262626', border: '1px solid #3a3a4a' }}>
        <h3 className="text-lg font-semibold text-white mb-1">Appareils connectés</h3>
        <p className="text-sm text-[#E0E0E0] mb-4">Gérez les appareils connectés à votre compte et surveillez l&apos;activité de connexion.</p>
        
        <div className="space-y-4">
          {/* Appareil actuel */}
          <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-white">Cet appareil</p>
                <p className="text-xs text-[#9ca3af]">Windows 10 • Chrome • Paris, France</p>
                <p className="text-xs text-[#9ca3af]">IP: 192.168.1.100 • Connecté maintenant</p>
              </div>
            </div>
            <span className="text-xs text-green-500 font-medium">Actuel</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
          <button 
            disabled={true}
            className="px-4 py-2 border-none text-sm font-medium rounded-md shadow-sm text-white bg-[#303030] hover:bg-[#444] focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#303030]"
          >
            Déconnecter tous les appareils
          </button>
        </div>
      </div>
    </div>
  )

  const renderBillingContent = () => (
    <div className="space-y-6">
      <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Check className="h-6 w-6 text-[#9ca3af]" />
          <div>
            <h4 className="font-semibold text-white">Toutes les fonctionnalités sont actuellement gratuites !</h4>
            <p className="text-[#9ca3af] text-sm">
              Profitez de toutes les fonctionnalités de Pickle Glass gratuitement. Les plans Pro et Enterprise seront bientôt disponibles avec des fonctionnalités premium supplémentaires.
            </p>
          </div>
        </div>
      </div>
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
            <div className="rounded-lg p-6 text-white" style={{ background: '#262626', border: '1px solid #3a3a4a' }}>
              <h3 className="text-lg font-semibold text-white mb-1">Nom affiché</h3>
              <p className="text-sm text-[#E0E0E0] mb-4">Saisissez votre nom complet ou un nom d&apos;affichage de votre choix.</p>
              <div className="max-w-sm">
                 <input
                    type="text"
                    id="display-name"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="block w-full rounded-md border border-[#3a3a4a] bg-[#232329] text-white placeholder-white focus:outline-none focus:border-[#3f3f46] sm:text-sm"
                    placeholder="Saisir votre nom d&apos;affichage"
                  />
              </div>
              <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSaving || !displayNameInput || displayNameInput === userInfo?.display_name}
                    className="px-4 py-2 border-none text-sm font-medium rounded-md shadow-sm text-white bg-[#303030] hover:bg-[#444] focus:outline-none disabled:opacity-50"
                  >
                    Mettre à jour
                  </button>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ background: '#262626', color: '#E0E0E0', border: '1px solid #3a3a4a' }}>
              <h3 className="text-lg font-semibold text-white mb-1">Supprimer le compte</h3>
              <p className="text-sm text-[#E0E0E0] mb-4">Supprimez définitivement votre compte personnel et tout le contenu de la plateforme Pickle Glass. Cette action est irréversible, veuillez procéder avec précaution.</p>
              <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
                 <button
                     onClick={() => setShowDeleteModal(true)}
                     className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                 >
                     Supprimer
                 </button>
              </div>
            </div>
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
    <div className="bg-transparent min-h-screen text-white animate-fade-in">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-white mb-1">Paramètres</p>
          <h1 className="text-3xl font-bold text-white">Paramètres personnels</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#9ca3af] text-white'
                    : 'border-transparent text-white hover:text-[#9ca3af] hover:border-[#9ca3af]'
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {renderTabContent()}
      </div>

      {/* Modal de suppression de compte */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-[#1f1f1f] p-6 rounded-lg shadow-2xl max-w-md w-full border border-[#3a3a4a]">
            <h2 className="text-xl font-bold mb-4 text-white">
              Supprimer le compte définitivement
            </h2>
            <p className="text-sm text-[#E0E0E0] mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et supprimera toutes vos données (sessions, presets, profil).
            </p>
            
            {deleteError && (
              <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded-md border border-red-500/30 mb-4">
                {deleteError}
              </p>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-[#3a3a4a] rounded-md text-white hover:bg-[#3a3a4a] focus:outline-none transition-all duration-200 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 rounded-md text-white font-medium focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative overflow-hidden rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-600'
                : notification.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
            }`}
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
    </div>
  )
} 
