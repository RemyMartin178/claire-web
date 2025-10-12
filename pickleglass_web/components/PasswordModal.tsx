'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePasswordModal } from '@/contexts/PasswordModalContext'
import { getAuthType } from '@/utils/api'
import { auth } from '@/utils/firebase'
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  linkWithCredential 
} from 'firebase/auth'
import { Eye, EyeOff } from 'lucide-react'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  progress: number
}

export default function PasswordModal() {
  const { isOpen, closeModal } = usePasswordModal()
  const { user: userInfo } = useAuth()
  
  const [authType, setAuthType] = useState<'google' | 'email' | null>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isClosing, setIsClosing] = useState(false)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

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
      // Fallback si l'élément n'est pas trouvé
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }

  // Détecter le type d'authentification
  useEffect(() => {
    if (isOpen && userInfo) {
      const detectAuthType = async () => {
        try {
          const authInfo = await getAuthType();
          setAuthType(authInfo.authType);
        } catch (error) {
          console.error('Erreur lors de la détection du type d\'authentification:', error);
          const email = userInfo.email || '';
          if (email.includes('@gmail.com') || email.includes('@google.com')) {
            setAuthType('google');
          } else {
            setAuthType('email');
          }
        }
      };
      detectAuthType();
    }
  }, [isOpen, userInfo]);

  const isGoogleUser = authType === 'google';

  // Gérer la fermeture du modal avec animation
  const handleCloseModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      closeModal();
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setIsClosing(false);
    }, 200); // Durée de l'animation de sortie
  }, [closeModal]);

  // Gérer l'affichage/masquage des mots de passe
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Gérer la soumission du formulaire
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        addNotification('Vous devez être connecté pour modifier votre mot de passe.', 'error');
        return;
      }

      // Validation des mots de passe
      if (isGoogleUser) {
        // Pour Google : vérifier nouveau mot de passe + confirmation
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
          addNotification('Veuillez remplir tous les champs.', 'error');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          addNotification('Les mots de passe ne correspondent pas.', 'error');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          addNotification('Le mot de passe doit contenir au moins 8 caractères.', 'error');
          return;
        }

        // Pour les utilisateurs Google, on ajoute un mot de passe à leur compte
        try {
          const credential = EmailAuthProvider.credential(
            currentUser.email!,
            passwordData.newPassword
          );
          
          await linkWithCredential(currentUser, credential);
          addNotification('Mot de passe ajouté avec succès !', 'success');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de l\'ajout du mot de passe:', error);
          if (error.code === 'auth/email-already-in-use') {
            addNotification('Ce compte Google a déjà un mot de passe.', 'error');
          } else if (error.code === 'auth/weak-password') {
            addNotification('Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.', 'error');
          } else if (error.code === 'auth/invalid-email') {
            addNotification('Adresse email invalide.', 'error');
          } else if (error.code === 'auth/credential-already-in-use') {
            addNotification('Ce mot de passe est déjà utilisé par un autre compte.', 'error');
          } else {
            addNotification('Impossible d\'ajouter le mot de passe. Veuillez réessayer.', 'error');
          }
        }
      } else {
        // Pour Email/MDP : vérifier ancien + nouveau + confirmation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          addNotification('Veuillez remplir tous les champs.', 'error');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          addNotification('Les nouveaux mots de passe ne correspondent pas.', 'error');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          addNotification('Le mot de passe doit contenir au moins 8 caractères.', 'error');
          return;
        }

        // Vérifier l'ancien mot de passe
        try {
          const credential = EmailAuthProvider.credential(
            currentUser.email!,
            passwordData.currentPassword
          );
          
          // Réauthentifier l'utilisateur avec l'ancien mot de passe
          await reauthenticateWithCredential(currentUser, credential);
          
          // Si la réauthentification réussit, mettre à jour le mot de passe
          await updatePassword(currentUser, passwordData.newPassword);
          
          addNotification('Mot de passe modifié avec succès !', 'success');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de la modification du mot de passe:', error);
          if (error.code === 'auth/wrong-password') {
            addNotification('L\'ancien mot de passe n\'est pas correct.', 'error');
          } else if (error.code === 'auth/weak-password') {
            addNotification('Le nouveau mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.', 'error');
          } else if (error.code === 'auth/requires-recent-login') {
            addNotification('Pour des raisons de sécurité, vous devez vous reconnecter avant de modifier votre mot de passe.', 'error');
          } else if (error.code === 'auth/invalid-credential') {
            addNotification('L\'ancien mot de passe n\'est pas correct.', 'error');
          } else if (error.code === 'auth/user-mismatch') {
            addNotification('Erreur d\'authentification. Veuillez vous reconnecter.', 'error');
          } else if (error.code === 'auth/too-many-requests') {
            addNotification('Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.', 'error');
          } else if (error.code === 'auth/network-request-failed') {
            addNotification('Erreur de connexion. Vérifiez votre connexion internet et réessayez.', 'error');
          } else {
            addNotification('Erreur lors de la modification du mot de passe. Veuillez réessayer.', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du mot de passe:', error);
      addNotification('Une erreur inattendue est survenue. Veuillez réessayer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer le clic en dehors du modal pour le fermer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Empêcher le scroll du body et pointer-events sur tout sauf le modal
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      
      // Réactiver pointer-events pour le modal
      const modalElement = document.querySelector('.modal-overlay') as HTMLElement;
      if (modalElement) {
        modalElement.style.pointerEvents = 'auto';
      }

      // Focus sur le premier input après le rendu
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 300); // Attendre que l'animation d'entrée soit terminée
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
      document.body.style.pointerEvents = 'auto';
    };
  }, [isOpen, handleCloseModal]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal de gestion du mot de passe */}
      <div className={`modal-overlay fixed top-0 left-0 w-full h-full flex items-center justify-center z-[9999] transition-all duration-300 ${
        isClosing 
          ? 'bg-black bg-opacity-0' 
          : 'bg-black bg-opacity-50 animate-fade-in'
      }`}>
        <div 
          ref={modalRef} 
          className={`bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 transition-all duration-300 ${
            isClosing 
              ? 'opacity-0 scale-95' 
              : 'opacity-100 scale-100 animate-scale-in'
          }`}
        >
          <h2 className="text-2xl font-heading font-semibold mb-2 text-[#282828]">
            {isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier votre mot de passe'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {isGoogleUser 
              ? 'Ajoutez un mot de passe à votre compte pour une sécurité renforcée.'
              : 'Mettez à jour votre mot de passe pour sécuriser votre compte.'
            }
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {!isGoogleUser && (
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-[#282828] mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="animate-slide-up" style={{ animationDelay: isGoogleUser ? '0.1s' : '0.2s' }}>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[#282828] mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm pr-10"
                  placeholder="Minimum 8 caractères"
                  required
                  ref={firstInputRef}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: isGoogleUser ? '0.2s' : '0.3s' }}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#282828] mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6 animate-fade-in" style={{ animationDelay: isGoogleUser ? '0.3s' : '0.4s' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-[#374151] hover:bg-gray-50 focus:outline-none transition-all duration-200 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || 
                  (isGoogleUser ? 
                    (!passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword) :
                    (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword)
                  )
                }
                className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-300 rounded-lg text-white font-medium focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Modification...
                  </span>
                ) : (isGoogleUser ? 'Ajouter' : 'Modifier')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            data-notification-id={notification.id}
            className={`relative overflow-hidden rounded-xl shadow-lg animate-slide-up ${
              notification.type === 'success'
                ? 'bg-green-50 border-2 border-green-200'
                : notification.type === 'error'
                ? 'bg-red-50 border-2 border-red-200'
                : 'bg-blue-50 border-2 border-blue-200'
            }`}
          >
            {/* Contenu de la notification */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {notification.type === 'success' && (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {notification.type === 'error' && (
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <span className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {notification.message}
                </span>
              </div>
              <button 
                onClick={() => removeNotification(notification.id)} 
                className={`ml-3 transition-colors text-lg font-bold ${
                  notification.type === 'success' ? 'text-green-600 hover:text-green-800' :
                  notification.type === 'error' ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                ×
              </button>
            </div>
            
            {/* Barre de progression en bas */}
            <div 
              className={`absolute bottom-0 left-0 h-1 transition-all duration-100 ease-linear ${
                notification.type === 'success' ? 'bg-green-500' :
                notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${notification.progress}%` }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
