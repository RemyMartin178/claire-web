'use client'

import { useState, useEffect, useRef } from 'react'
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
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeModal();
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setIsClosing(false);
    }, 200); // Durée de l'animation de sortie
  };

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
      <div className={`modal-overlay fixed top-0 left-0 w-full h-full flex items-center justify-center z-[9999] transition-all duration-200 ${
        isClosing 
          ? 'bg-black bg-opacity-0' 
          : 'bg-black bg-opacity-90 animate-modal-fade-in'
      }`}>
        <div 
          ref={modalRef} 
          className={`bg-[#1f1f1f] p-6 rounded-lg shadow-2xl max-w-sm w-full border border-[#3a3a4a] transition-all duration-200 ${
            isClosing 
              ? 'animate-modal-slide-out' 
              : 'animate-modal-slide-in'
          }`}
        >
          <h2 className="text-xl font-bold mb-4 text-white">
            {isGoogleUser ? 'Ajouter un mot de passe Google' : 'Modifier votre mot de passe'}
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {!isGoogleUser && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-white mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#262626] border border-[#3a3a4a] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#9ca3af] transition-all duration-200 text-sm pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4 flex items-center justify-center hover:text-white transition-colors hover:transform-none"
                    style={{ transform: 'translate(-50%, -50%)' }}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-white mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#262626] border border-[#3a3a4a] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#9ca3af] transition-all duration-200 text-sm pr-10"
                  placeholder="••••••••"
                  required
                  ref={firstInputRef}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4 flex items-center justify-center hover:text-white transition-colors hover:transform-none"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#262626] border border-[#3a3a4a] rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#9ca3af] transition-all duration-200 text-sm pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4 flex items-center justify-center hover:text-white transition-colors hover:transform-none"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-[#3a3a4a] rounded-md text-white hover:bg-[#3a3a4a] focus:outline-none transition-all duration-200 text-sm"
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
                className="px-4 py-2 bg-[#303030] hover:bg-[#444] disabled:bg-[#1a1a1a] rounded-md text-white font-medium focus:outline-none transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1a1a1a] text-sm"
              >
                {isSubmitting ? 'Modification...' : (isGoogleUser ? 'Ajouter' : 'Modifier')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            data-notification-id={notification.id}
            className={`relative overflow-hidden shadow-lg animate-slide-in-right ${
              notification.type === 'success'
                ? 'bg-[#262626] border border-[#22c55e]'
                : notification.type === 'error'
                ? 'bg-[#262626] border border-[#ef4444]'
                : 'bg-[#262626] border border-[#3a3a4a]'
            }`}
          >
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
            
            {/* Barre de progression en bas */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-white transition-all duration-100 ease-linear"
              style={{ width: `${notification.progress}%` }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
