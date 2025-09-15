'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { getAuthType } from '@/utils/api'
import { usePasswordModal } from '@/contexts/PasswordModalContext'

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

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  progress: number
}

export default function SecurityPage() {
  const { user: userInfo, loading } = useAuth();
  const { openModal } = usePasswordModal();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState<'google' | 'email' | null>(null);



  // Fonction pour détecter le type d'authentification depuis la base de données
  const detectAuthType = useCallback(async () => {
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
  }, [userInfo]);

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
    openModal();
  };

  

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
  }, [userInfo, detectAuthType]);

  const handleDisconnectDevice = async (deviceId: string) => {
    try {
      // Simuler la déconnexion d'un appareil avec confirmation
      setDevices(prev => prev.filter(device => device.id !== deviceId));
      console.log(`Appareil déconnecté avec succès. Il devra se reconnecter pour accéder à votre compte.`);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleDisconnectAllDevices = async () => {
    try {
      // Simuler la déconnexion de tous les appareils avec confirmation
      // Garder seulement l'appareil actuel
      setDevices(prev => prev.filter(device => device.isCurrent));
      console.log('Tous les autres appareils ont été déconnectés. Ils devront se reconnecter pour accéder à votre compte.');
    } catch (error) {
      console.error('Erreur lors de la déconnexion de tous les appareils:', error);
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
          <div className="rounded-lg p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
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
          <div className="rounded-lg p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
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


    </div>
  )
}
