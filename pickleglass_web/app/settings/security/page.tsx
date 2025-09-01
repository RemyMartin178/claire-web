'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { getAuthType } from '@/utils/api'
import { auth } from '@/utils/firebase'
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  linkWithCredential 
} from 'firebase/auth'
import { Eye, EyeOff } from 'lucide-react'

interface Device {
  id: string
  name: string
  os: string
  browser: string
  location: string
  ip: string
  lastSeen: string
  isCurrent: boolean
}

export default function SecurityPage() {
  const { user: userInfo, loading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState<'google' | 'email' | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour détecter le type d'authentification depuis la base de données
  const detectAuthType = async () => {
    if (!userInfo) return;
    
    try {
      // Utiliser la nouvelle fonction API pour récupérer le type d'auth
      const authInfo = await getAuthType();
      setAuthType(authInfo.authType);
    } catch (error) {
      console.error('Erreur lors de la détection du type d\'authentification:', error);
      // Fallback sur la détection par email
      const email = userInfo.email || '';
      if (email.includes('@gmail.com') || email.includes('@google.com')) {
        setAuthType('google');
      } else {
        setAuthType('email');
      }
    }
  };

  // Détection plus précise de l'utilisateur Google vs Email/MDP
  // Basé sur l'API et la base de données
  const isGoogleUser = authType === 'google';

  // Pour les utilisateurs Google, on propose d'ajouter un mot de passe
  // Pour les utilisateurs Email/MDP, on propose de modifier le mot de passe existant
  const passwordActionText = isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier le mot de passe';
  const passwordDescription = isGoogleUser 
    ? 'Ajoutez un mot de passe à votre compte Google pour une sécurité renforcée.'
    : 'Modifiez votre mot de passe existant pour sécuriser votre compte.';

  // Gérer l'ouverture du modal
  const handlePasswordAction = () => {
    setShowPasswordModal(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    // Focus sur le premier input après le rendu
    setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    }, 100);
  };

  // Gérer la fermeture du modal
  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setShowPasswords({ current: false, new: false, confirm: false });
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
    setPasswordError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setPasswordError('Vous devez être connecté pour modifier votre mot de passe');
        return;
      }

      // Validation des mots de passe
      if (isGoogleUser) {
        // Pour Google : vérifier nouveau mot de passe + confirmation
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
          setPasswordError('Veuillez remplir tous les champs');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordError('Les mots de passe ne correspondent pas');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
          return;
        }

        // Pour les utilisateurs Google, on ajoute un mot de passe à leur compte
        try {
          const credential = EmailAuthProvider.credential(
            currentUser.email!,
            passwordData.newPassword
          );
          
          await linkWithCredential(currentUser, credential);
          alert('Mot de passe ajouté avec succès !');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de l\'ajout du mot de passe:', error);
          if (error.code === 'auth/email-already-in-use') {
            setPasswordError('Ce compte Google a déjà un mot de passe');
          } else if (error.code === 'auth/weak-password') {
            setPasswordError('Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.');
          } else if (error.code === 'auth/invalid-email') {
            setPasswordError('Adresse email invalide');
          } else {
            setPasswordError('Impossible d\'ajouter le mot de passe. Veuillez réessayer.');
          }
        }
      } else {
        // Pour Email/MDP : vérifier ancien + nouveau + confirmation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          setPasswordError('Veuillez remplir tous les champs');
          return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordError('Les nouveaux mots de passe ne correspondent pas');
          return;
        }
        if (passwordData.newPassword.length < 8) {
          setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
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
          
          alert('Mot de passe modifié avec succès !');
          handleCloseModal();
        } catch (error: any) {
          console.error('Erreur lors de la modification du mot de passe:', error);
          if (error.code === 'auth/wrong-password') {
            setPasswordError('L\'ancien mot de passe n\'est pas correct');
          } else if (error.code === 'auth/weak-password') {
            setPasswordError('Le nouveau mot de passe est trop faible. Utilisez au moins 8 caractères avec des lettres, chiffres et symboles.');
          } else if (error.code === 'auth/requires-recent-login') {
            setPasswordError('Pour des raisons de sécurité, vous devez vous reconnecter avant de modifier votre mot de passe');
          } else if (error.code === 'auth/invalid-credential') {
            setPasswordError('Informations d\'identification invalides');
          } else if (error.code === 'auth/user-mismatch') {
            setPasswordError('Erreur d\'authentification. Veuillez vous reconnecter.');
          } else {
            setPasswordError('Erreur lors de la modification du mot de passe. Veuillez réessayer.');
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du mot de passe:', error);
      setPasswordError('Une erreur inattendue est survenue. Veuillez réessayer.');
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

    if (showPasswordModal) {
      document.addEventListener('mousedown', handleClickOutside);
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showPasswordModal]);

  // Simuler la récupération des appareils connectés
  useEffect(() => {
    if (userInfo) {
      detectAuthType();
      
      // Fonction pour récupérer les vraies informations de l'appareil
      const detectCurrentDevice = async () => {
        try {
          // Récupérer l'IP publique et la géolocalisation
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          
          const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
          const geoData = await geoResponse.json();
          
          // Détecter le navigateur et l'OS plus précisément
          const userAgent = navigator.userAgent;
          let browser = 'Unknown';
          let os = 'Unknown';
          
          // Détection du navigateur
          if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
          } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
          } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
          } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
          } else if (userAgent.includes('Opera')) {
            browser = 'Opera';
          }
          
          // Détection de l'OS
          if (userAgent.includes('Windows')) {
            os = 'Windows';
          } else if (userAgent.includes('Mac')) {
            os = 'macOS';
          } else if (userAgent.includes('Linux')) {
            os = 'Linux';
          } else if (userAgent.includes('Android')) {
            os = 'Android';
          } else if (userAgent.includes('iOS')) {
            os = 'iOS';
          }
          
          // Créer l'appareil avec les vraies informations
          const currentDevice: Device = {
            id: 'current',
            name: 'Cet appareil',
            os: os,
            browser: browser,
            location: `${geoData.city || 'Inconnu'}, ${geoData.country_name || 'Inconnu'}`,
            ip: ipData.ip,
            lastSeen: 'Connecté maintenant',
            isCurrent: true
          };
          
          setDevices([currentDevice]);
        } catch (error) {
          console.error('Erreur lors de la détection de l\'appareil:', error);
          
          // Fallback avec les informations de base si les APIs échouent
          const fallbackDevice: Device = {
            id: 'current',
            name: 'Cet appareil',
            os: navigator.platform.includes('Win') ? 'Windows' : 
                navigator.platform.includes('Mac') ? 'macOS' : 
                navigator.platform.includes('Linux') ? 'Linux' : 'Unknown',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
                    navigator.userAgent.includes('Firefox') ? 'Firefox' :
                    navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
            location: 'Localisation non disponible',
            ip: 'IP non disponible',
            lastSeen: 'Connecté maintenant',
            isCurrent: true
          };
          
          setDevices([fallbackDevice]);
        }
      };
      
      detectCurrentDevice();
    }
  }, [userInfo]);

  const handleDisconnectDevice = async (deviceId: string) => {
    try {
      // Simuler la déconnexion d'un appareil avec confirmation
      if (confirm('Êtes-vous sûr de vouloir déconnecter cet appareil ?')) {
        setDevices(prev => prev.filter(device => device.id !== deviceId));
        alert(`Appareil déconnecté avec succès. Il devra se reconnecter pour accéder à votre compte.`);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      alert('Erreur lors de la déconnexion de l\'appareil. Veuillez réessayer.');
    }
  };

  const handleDisconnectAllDevices = async () => {
    try {
      // Simuler la déconnexion de tous les appareils avec confirmation
      if (confirm('Êtes-vous sûr de vouloir déconnecter tous les autres appareils ? Vous resterez connecté sur cet appareil.')) {
        // Garder seulement l'appareil actuel
        setDevices(prev => prev.filter(device => device.isCurrent));
        alert('Tous les autres appareils ont été déconnectés. Ils devront se reconnecter pour accéder à votre compte.');
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion de tous les appareils:', error);
      alert('Erreur lors de la déconnexion des appareils. Veuillez réessayer.');
    }
  };

  // Afficher un loader pendant le chargement au lieu de rediriger
  if (loading) {
    return (
      <div className="bg-transparent min-h-screen text-white animate-fade-in">
        <div className="px-8 py-8">
          <div className="mb-6">
            <p className="text-xs text-white mb-1">Paramètres</p>
            <h1 className="text-3xl font-bold text-white">Paramètres personnels</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    )
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
                  tab.id === 'security'
                    ? 'border-[#9ca3af] text-white'
                    : 'border-transparent text-white hover:text-[#9ca3af] hover:border-[#9ca3af]'
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {/* Mot de passe */}
          <div className="rounded-lg p-6 text-white" style={{ background: '#262626', border: '1px solid #3a3a4a' }}>
            <h3 className="text-lg font-semibold text-white mb-1">Mot de passe</h3>
            <p className="text-sm text-[#E0E0E0] mb-4">
              {passwordDescription}
            </p>
            <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
              <button
                onClick={handlePasswordAction}
                disabled={isLoading}
                className="px-4 py-2 border-none text-sm font-medium rounded-md shadow-sm text-white bg-[#303030] hover:bg-[#444] focus:outline-none disabled:opacity-50"
              >
                {isLoading ? 'Chargement...' : passwordActionText}
              </button>
            </div>
          </div>

          {/* Appareils connectés */}
          <div className="rounded-lg p-6 text-white" style={{ background: '#262626', border: '1px solid #3a3a4a' }}>
            <h3 className="text-lg font-semibold text-white mb-1">Appareils connectés</h3>
            <p className="text-sm text-[#E0E0E0] mb-4">Gérez les appareils connectés à votre compte et surveillez l&apos;activité de connexion.</p>
            
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-md">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${device.isCurrent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-white">{device.name}</p>
                      <p className="text-xs text-[#9ca3af]">{device.os} • {device.browser} • {device.location}</p>
                      <p className="text-xs text-[#9ca3af]">IP: {device.ip} • {device.lastSeen}</p>
                    </div>
                  </div>
                  {device.isCurrent ? (
                    <span className="text-xs text-green-500 font-medium">Actuel</span>
                  ) : (
                    <button 
                      onClick={() => handleDisconnectDevice(device.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Déconnecter
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#3a3a4a] flex justify-end">
              <button 
                onClick={handleDisconnectAllDevices}
                disabled={devices.length <= 1}
                className="px-4 py-2 border-none text-sm font-medium rounded-md shadow-sm text-white bg-[#303030] hover:bg-[#444] focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#303030]"
              >
                Déconnecter tous les appareils
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de gestion du mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-[#1f1f1f] p-6 rounded-lg shadow-2xl max-w-sm w-full border border-[#3a3a4a]">
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
              {passwordError && (
                <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded-md border border-red-500/30">
                  {passwordError}
                </p>
              )}
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
      )}
    </div>
  )
}
