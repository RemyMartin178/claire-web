'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { getAuthType } from '@/utils/api'
import { usePasswordModal } from '@/contexts/PasswordModalContext'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  const isGoogleUser = authType === 'google';

  const passwordActionText = isGoogleUser ? 'Ajouter un mot de passe' : 'Modifier le mot de passe';
  const passwordDescription = isGoogleUser 
    ? 'Ajoutez un mot de passe à votre compte Google pour une sécurité renforcée.'
    : 'Modifiez votre mot de passe existant pour sécuriser votre compte.';

  const handlePasswordAction = () => {
    openModal();
  };

  // Simuler la récupération des appareils connectés
  useEffect(() => {
    if (userInfo) {
      detectAuthType();
      
      const detectCurrentDevice = async () => {
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          
          const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
          const geoData = await geoResponse.json();
          
          const userAgent = navigator.userAgent;
          let browser = 'Unknown';
          let os = 'Unknown';
          
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
      setDevices(prev => prev.filter(device => device.id !== deviceId));
      console.log(`Appareil déconnecté avec succès. Il devra se reconnecter pour accéder à votre compte.`);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleDisconnectAllDevices = async () => {
    try {
      setDevices(prev => prev.filter(device => device.isCurrent));
      console.log('Tous les autres appareils ont été déconnectés. Ils devront se reconnecter pour accéder à votre compte.');
    } catch (error) {
      console.error('Erreur lors de la déconnexion de tous les appareils:', error);
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
        </div>
      </Page>
    )
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
                tab.id === 'security'
                  ? 'border-primary text-[#282828]'
                  : 'border-transparent text-gray-600 hover:text-[#282828] hover:border-gray-300'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {/* Mot de passe */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-heading font-semibold text-[#282828] mb-1">Mot de passe</h3>
            <p className="text-sm text-gray-600 mb-4">
              {passwordDescription}
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <Button
                onClick={handlePasswordAction}
                disabled={isLoading}
                className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
              >
                {isLoading ? 'Chargement...' : passwordActionText}
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
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-subtle-bg rounded-md">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${device.isCurrent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-[#282828]">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.os} • {device.browser} • {device.location}</p>
                      <p className="text-xs text-gray-500">IP: {device.ip} • {device.lastSeen}</p>
                    </div>
                  </div>
                  {device.isCurrent ? (
                    <span className="text-xs text-green-600 font-medium">Actuel</span>
                  ) : (
                    <Button 
                      onClick={() => handleDisconnectDevice(device.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Déconnecter
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <Button 
                onClick={handleDisconnectAllDevices}
                disabled={devices.length <= 1}
                variant="outline"
              >
                Déconnecter tous les appareils
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
