'use client'

import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { Chrome } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isElectronMode, setIsElectronMode] = useState(false)
  // SUPPRIMER : const { t, i18n } = useTranslation();
  // SUPPRIMER : i18n.changeLanguage('fr');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    setIsElectronMode(mode === 'electron')
  }, [])

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    setIsLoading(true)
    try {
      await signInWithPopup(auth, provider)
      router.push('/settings')
    } catch (error: any) {
      console.error('❌ Échec de la connexion Google :', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('Une erreur est survenue lors de la connexion. Veuillez réessayer.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur Pickle Glass</h1>
        <p className="text-gray-600 mt-2">Connectez-vous avec votre compte Google pour synchroniser vos données sur tous vos appareils.</p>
        {isElectronMode ? (
          <p className="text-sm text-blue-600 mt-1 font-medium">🔗 Connexion demandée depuis l'application Electron</p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Le mode local sera utilisé si vous ne vous connectez pas.</p>
        )}
      </div>
      <div className="w-full max-w-sm">
        <div className="main-bg p-8 rounded-lg shadow-md border border-gray-200 text-white">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="h-5 w-5" />
            <span>{isLoading ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
          </button>
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (isElectronMode) {
                  window.location.href = 'pickleglass://auth-success?uid=default_user&email=contact@pickle.com&displayName=Default%20User'
                } else {
                  router.push('/settings')
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Continuer en mode local
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          En vous connectant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité.
        </p>
      </div>
    </div>
  )
} 