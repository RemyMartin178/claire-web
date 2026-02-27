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
import { toast } from 'react-hot-toast'

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
  const [isClosing, setIsClosing] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

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
        toast.error('Vous devez être connecté pour modifier votre mot de passe.');
        return;
      }

      // Validation des mots de passe
      if (isGoogleUser) {
        // Pour Google : vérifier nouveau mot de passe + confirmation
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
          toast.error('Veuillez remplir tous les champs.');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas.');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          toast.error('Le mot de passe doit contenir au moins 8 caractères.');
          return;
        }

        // Pour les utilisateurs Google, on ajoute un mot de passe à leur compte
        try {
          const credential = EmailAuthProvider.credential(
            currentUser.email!,
            passwordData.newPassword
          );

          await linkWithCredential(currentUser, credential);
          toast.success('Mot de passe ajouté');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de l\'ajout du mot de passe:', error);
          if (error.code === 'auth/email-already-in-use') {
            toast.error('Ce compte Google a déjà un mot de passe.');
          } else if (error.code === 'auth/weak-password') {
            toast.error('Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.');
          } else if (error.code === 'auth/invalid-email') {
            toast.error('Adresse email invalide.');
          } else if (error.code === 'auth/credential-already-in-use') {
            toast.error('Ce mot de passe est déjà utilisé par un autre compte.');
          } else {
            toast.error('Impossible d\'ajouter le mot de passe. Veuillez réessayer.');
          }
        }
      } else {
        // Pour Email/MDP : vérifier ancien + nouveau + confirmation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          toast.error('Veuillez remplir tous les champs.');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast.error('Les nouveaux mots de passe ne correspondent pas.');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          toast.error('Le mot de passe doit contenir au moins 8 caractères.');
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

          toast.success('Mot de passe modifié');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de la modification du mot de passe:', error);
          if (error.code === 'auth/wrong-password') {
            toast.error('L\'ancien mot de passe n\'est pas correct.');
          } else if (error.code === 'auth/weak-password') {
            toast.error('Le nouveau mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.');
          } else if (error.code === 'auth/requires-recent-login') {
            toast.error('Pour des raisons de sécurité, vous devez vous reconnecter avant de modifier votre mot de passe.');
          } else if (error.code === 'auth/invalid-credential') {
            toast.error('L\'ancien mot de passe n\'est pas correct.');
          } else if (error.code === 'auth/user-mismatch') {
            toast.error('Erreur d\'authentification. Veuillez vous reconnecter.');
          } else if (error.code === 'auth/too-many-requests') {
            toast.error('Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.');
          } else if (error.code === 'auth/network-request-failed') {
            toast.error('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
          } else {
            toast.error('Erreur lors de la modification du mot de passe. Veuillez réessayer.');
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du mot de passe:', error);
      toast.error('Une erreur inattendue est survenue. Veuillez réessayer.');
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
      <div className={`modal-overlay fixed top-0 left-0 w-full h-full flex items-center justify-center z-[9999] transition-all duration-300 ${isClosing
        ? 'bg-black bg-opacity-0'
        : 'bg-black bg-opacity-50 animate-fade-in'
        }`}>
        <div
          ref={modalRef}
          className={`bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 transition-all duration-300 ${isClosing
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
    </>
  );
}
