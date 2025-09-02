'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signInWithGoogle, signInWithEmail, handleGoogleRedirectResult } from '@/utils/auth'
import { handleFirebaseError, shouldLogError } from '@/utils/errorHandler'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { getApiBase } from '@/utils/http'
import { auth } from '@/utils/firebase'
 

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useAuth()
  const params = useSearchParams()
  const isMobileFlow = useMemo(() => params?.get('flow') === 'mobile', [params])
  const sessionId = useMemo(() => params?.get('session_id') || '', [params])
  

  // Redirection si déjà connecté (hors flow mobile) sans casser l'ordre des hooks
  useEffect(() => {
    if (user && !isMobileFlow) {
      router.push('/activity')
    }
  }, [user, isMobileFlow, router])

  // Traitement du retour Google (redirect result)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const redirectUser = await handleGoogleRedirectResult()
        if (!mounted) return
        if (redirectUser) {
          sessionStorage.removeItem('manuallyLoggedOut')
          if (isMobileFlow) {
            // Page neutre + deep link
            router.push(`/auth/success?flow=mobile&session_id=${encodeURIComponent(sessionId)}`)
          } else {
            router.push('/activity')
          }
        }
      } catch (error: any) {
        const errorMessage = handleFirebaseError(error)
        setError(errorMessage)
        if (shouldLogError(error)) {
          console.error('Google redirect error:', error)
        }
      }
    })()
    return () => { mounted = false }
  }, [router, isMobileFlow, sessionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[Login] Début de la connexion email/mot de passe')
    setIsLoading(true)
    setError('')

    try {
      console.log('[Login] Appel de signInWithEmail...')
      const user = await signInWithEmail(formData.email, formData.password, formData.rememberMe)
      
      console.log('[Login] signInWithEmail terminé avec succès')
      console.log('[Login] isMobileFlow:', isMobileFlow, 'user:', !!user)
      // Associate tokens to pending session if mobile flow
      if (isMobileFlow && user) {
        // Association des tokens en arrière-plan (non-bloquante)
        (async () => {
          try {
            console.log('[Login] Début association des tokens (non-bloquante)...')
            const startTime = Date.now()
            const idToken = await user.getIdToken(true)
            console.log('[Login] getIdToken terminé en', Date.now() - startTime, 'ms')
            
            const refreshToken = user.refreshToken
            const API = getApiBase()
            console.log('[Login] Appel API associate...')
            const apiStartTime = Date.now()
            
            // Timeout de 5 secondes pour éviter le blocage
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)
            
            const response = await fetch(API + '/api/auth/associate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: sessionId, id_token: idToken, refresh_token: refreshToken }),
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            console.log('[Login] API associate terminée en', Date.now() - apiStartTime, 'ms')
            
            if (!response.ok) {
              console.warn('Association des tokens échouée, mais c\'est normal en production')
            } else {
              console.log('Tokens associés avec succès')
            }
          } catch (error) {
            console.warn('Erreur lors de l\'association des tokens (non-critique):', error)
          }
        })()
      }
      console.log('[Login] Suppression de manuallyLoggedOut')
      sessionStorage.removeItem('manuallyLoggedOut')
      if (isMobileFlow) {
        console.log('[Login] Redirection vers page de succès mobile')
        router.push(`/auth/success?flow=mobile&session_id=${encodeURIComponent(sessionId)}`)
      } else {
              console.log('[Login] Redirection vers activity')
      router.push('/activity')
      }
    } catch (error: any) {
      console.log('[Login] Erreur lors de la connexion email/mot de passe:', error)
      const errorMessage = handleFirebaseError(error)
      setError(errorMessage)
      
      if (shouldLogError(error)) {
        console.error('Login error:', error)
      }
    } finally {
      console.log('[Login] Fin de handleSubmit, setIsLoading(false)')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      console.log('[Login] Début de la connexion Google')
      setIsLoading(true)
      setError('')
      console.log('[Login] Appel de signInWithGoogle...')
      const result = await signInWithGoogle(formData.rememberMe)
      console.log('[Login] signInWithGoogle terminé avec succès')
      
      // Associate tokens to pending session if mobile flow
      if (isMobileFlow) {
        // Association des tokens en arrière-plan (non-bloquante)
        (async () => {
          try {
            const user = auth.currentUser
            if (user) {
              console.log('[Login] Début association des tokens Google (non-bloquante)...')
              const idToken = await user.getIdToken(true)
              const refreshToken = user.refreshToken
              const API = getApiBase()
              
              // Timeout de 5 secondes pour éviter le blocage
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 5000)
              
              const response = await fetch(API + '/api/auth/associate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, id_token: idToken, refresh_token: refreshToken }),
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)

              if (!response.ok) {
                console.warn('Association des tokens échouée, mais c\'est normal en production')
              } else {
                console.log('Tokens associés avec succès')
              }
            }
          } catch (error) {
            console.warn('Erreur lors de l\'association des tokens (non-critique):', error)
          }
        })()
      }
      
      sessionStorage.removeItem('manuallyLoggedOut')
      if (isMobileFlow) {
        router.push(`/auth/success?flow=mobile&session_id=${encodeURIComponent(sessionId)}`)
      } else {
        router.push('/activity')
      }
          } catch (error: any) {
        console.log('[Login] Erreur lors de la connexion Google:', error)
        // Si l'utilisateur ferme/annule le popup, on arrête juste le spinner sans message intrusif
        const code = error?.code
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setError('')
        } else {
          const errorMessage = handleFirebaseError(error)
          setError(errorMessage)
        }
        
        if (shouldLogError(error)) {
          console.error('Google sign in error:', error)
        }
      } finally {
        console.log('[Login] Fin de handleGoogleSignIn, setIsLoading(false)')
        setIsLoading(false)
      }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in" style={{ background: '#202123' }}>
      <div className="w-full max-w-md mx-auto">
        {/* Logo en haut à gauche avec animation */}
        <div className="absolute top-8 left-8 flex items-center gap-3 animate-slide-in">
          <img src="/word.png" alt="Claire Logo" className="w-16 h-16 animate-bounce-gentle" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        
        {/* Formulaire avec finitions Cluely */}
        <div className="animate-scale-in w-full max-w-lg">
          <div className="text-center mb-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur Claire</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm animate-slide-up backdrop-blur-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Adresse email
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-10 text-sm px-3 rounded-lg border border-[#3f3f46] bg-[#27272a] text-white placeholder-[#bbb] focus:outline-none focus:border-[#3f3f46] transition-all duration-200"
                  placeholder="exemple@email.com"
                  required
                />
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Mot de passe
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-10 text-sm px-3 pr-10 rounded-lg border border-[#3f3f46] bg-[#27272a] text-white placeholder-[#bbb] focus:outline-none focus:border-[#3f3f46] transition-all duration-200"
                  placeholder=""
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4 flex items-center justify-center hover:text-white transition-colors hover:transform-none"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[#9ca3af] bg-[#2a2a32] border-[#3a3a4a] rounded focus:ring-2 focus:ring-[#9ca3af]/20 transition-all duration-200 group-hover:border-[#4a4a5a]"
                />
                <span className="ml-2 text-white text-sm group-hover:text-white/90 transition-colors duration-200">Se souvenir de moi</span>
              </label>
              <a href="/auth/forgot-password" className="text-[#9ca3af] hover:text-[#e5e5e5] text-sm font-medium transition-colors duration-200 hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center group animate-slide-up border border-[#3a3a4a] bg-[#2a2a32] text-[#e5e5e5] hover:bg-[#3a3a4a] active:bg-[#404050] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:transform-none active:transform-none"
              style={{ animationDelay: '0.4s' }}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                <>
                  Continuer
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3a3a4a]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#232329] px-4 text-[#bbb] backdrop-blur-sm">OU</span>
              </div>
            </div>

            <div className="mt-6">
                              <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm border border-[#3a3a4a] bg-[#232329] text-[#e5e5e5] hover:bg-[#2a2a32] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:transform-none active:transform-none group"
                >
                                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Se connecter avec Google
              </button>
            </div>
          </div>

          <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="text-[#bbb] text-sm">
              Pas encore de compte ?{' '}
                           <a href="/auth/register" className="text-[#9ca3af] hover:text-[#e5e5e5] font-medium transition-colors duration-200 hover:underline">
               Créer un compte
             </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
