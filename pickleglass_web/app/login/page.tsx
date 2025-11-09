'use client'

import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isElectronMode, setIsElectronMode] = useState(false)
  const [isMobileFlow, setIsMobileFlow] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    const flow = urlParams.get('flow')
    const session = urlParams.get('session_id')
    
    setIsElectronMode(mode === 'electron')
    setIsMobileFlow(flow === 'mobile')
    setSessionId(session)
    
    console.log('[Login] Page loaded with params:', { mode, flow, session_id: session })
  }, [])

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    setIsLoading(true)
    
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      
      if (user) {
        console.log('✅ Google login successful:', user.uid)

        // Handle mobile flow (from Electron app with session_id)
        if (isMobileFlow && sessionId) {
          try {
            const idToken = await user.getIdToken()
            const refreshToken = (user as any).refreshToken
            
            console.log('📱 [Mobile Flow] Associating session:', sessionId)
            
            // Call backend to associate session with user
            const response = await fetch('/auth/associate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                session_id: sessionId, 
                id_token: idToken,
                refresh_token: refreshToken
              })
            })
            
            const data = await response.json()
            
            if (!data.success) {
              console.error('❌ [Mobile Flow] Associate failed:', data.error)
              alert('Erreur lors de l\'association de la session. Veuillez réessayer.')
              return
            }
            
            console.log('✅ [Mobile Flow] Session associated, redirecting to success page')
            
            // Redirect to success page with session_id
            router.push(`/auth/success?flow=mobile&session_id=${sessionId}`)
            
          } catch (error) {
            console.error('❌ [Mobile Flow] Processing failed:', error)
            alert('Erreur lors de la connexion. Veuillez réessayer.')
          }
        }
        // Handle old electron mode (deprecated)
        else if (isElectronMode) {
          try {
            const idToken = await user.getIdToken()
            
            const deepLinkUrl = `pickleglass://auth-success?` + new URLSearchParams({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              token: idToken
            }).toString()
            
            console.log('🔗 Return to electron app via deep link:', deepLinkUrl)
            
            window.location.href = deepLinkUrl
            
          } catch (error) {
            console.error('❌ Deep link processing failed:', error)
            alert('Login completed. Please return to Claire app.')
          }
        } 
        // Normal web flow
        else {
          router.push('/activity')
        }
      }
    } catch (error: any) {
      console.error('❌ Google login failed:', error)
      
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('An error occurred during login. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur Claire</h1>
        <p className="text-gray-600 mt-2">Connectez-vous avec votre compte Google pour synchroniser vos données.</p>
        {(isElectronMode || isMobileFlow) && (
          <p className="text-sm text-blue-600 mt-1 font-medium">🔗 Connexion demandée depuis l'application Claire</p>
        )}
        {isMobileFlow && sessionId && (
          <p className="text-xs text-gray-500 mt-1">Session ID: {sessionId.slice(0, 12)}...</p>
        )}
      </div>
      
      <div className="w-full max-w-sm">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{isLoading ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
          </button>
          
          {isElectronMode && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  window.location.href = 'pickleglass://auth-success?uid=default_user&email=contact@clairia.app&displayName=Default%20User'
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Continuer en mode local
              </button>
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-6">
          En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  )
}
