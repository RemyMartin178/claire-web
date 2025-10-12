'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signInWithGoogle, signInWithEmail, handleGoogleRedirectResult } from '@/utils/auth'
import { handleFirebaseError, shouldLogError } from '@/utils/errorHandler'
import { Eye, EyeOff } from 'lucide-react'
import { getApiBase } from '@/utils/apiBase'
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
  

  useEffect(() => {
    if (user && !isMobileFlow) {
      router.push('/activity')
    }
  }, [user, isMobileFlow, router])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const redirectUser = await handleGoogleRedirectResult()
        if (!mounted) return
        if (redirectUser) {
          if (isMobileFlow && sessionId) {
            await associateAfterLogin(sessionId)
          }
          sessionStorage.removeItem('manuallyLoggedOut')
          if (isMobileFlow) {
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
    setIsLoading(true)
    setError('')

    try {
      const user = await signInWithEmail(formData.email, formData.password, formData.rememberMe)
      
      if (isMobileFlow && sessionId && user) {
        await associateAfterLogin(sessionId)
      }
      sessionStorage.removeItem('manuallyLoggedOut')
      
      // Check if there's a Stripe return URL saved
      const stripeReturnUrl = sessionStorage.getItem('stripe_return_url')
      if (stripeReturnUrl) {
        sessionStorage.removeItem('stripe_return_url')
        router.push(stripeReturnUrl)
      } else if (isMobileFlow) {
        router.push(`/auth/success?flow=mobile&session_id=${encodeURIComponent(sessionId)}`)
      } else {
        router.push('/activity')
      }
    } catch (error: any) {
      const errorMessage = handleFirebaseError(error)
      setError(errorMessage)
      
      if (shouldLogError(error)) {
        console.error('Login error:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const associateAfterLogin = async (sessionId: string) => {
    const user = auth.currentUser
    if (!user) throw new Error('no_user_post_login')

    try {
      const { db } = await import('../../../utils/firebase')
      const { doc, setDoc } = await import('firebase/firestore')

      await setDoc(doc(db, 'pending_sessions', sessionId), {
        uid: user.uid,
        email: user.email,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 120000),
        used: false
      })
    } catch (error) {
      console.error('Error storing session:', error)
      throw new Error('firestore_storage_failed')
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      const result = await signInWithGoogle(formData.rememberMe)
      
      if (isMobileFlow && sessionId) {
        await associateAfterLogin(sessionId)
      }
      
      sessionStorage.removeItem('manuallyLoggedOut')
      
      // Check if there's a Stripe return URL saved
      const stripeReturnUrl = sessionStorage.getItem('stripe_return_url')
      if (stripeReturnUrl) {
        sessionStorage.removeItem('stripe_return_url')
        router.push(stripeReturnUrl)
      } else if (isMobileFlow) {
        router.push(`/auth/success?flow=mobile&session_id=${encodeURIComponent(sessionId)}`)
      } else {
        router.push('/activity')
      }
    } catch (error: any) {
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
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-subtle-bg">
      <div className="w-full max-w-md mx-auto">
        <div className="absolute top-8 left-8">
          <h1 className="text-2xl font-bold text-[#282828]">Claire</h1>
        </div>
        
        {/* Formulaire */}
        <div className="animate-scale-in w-full max-w-lg">
          <div className="text-center mb-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-[#282828] mb-2">Bienvenue sur Claire</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="email" className="block text-sm font-medium text-[#282828] mb-2">
                Adresse email
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-10 text-sm px-3 rounded-lg border border-gray-300 bg-white text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder="exemple@email.com"
                  required
                />
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <label htmlFor="password" className="block text-sm font-medium text-[#282828] mb-2">
                Mot de passe
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-10 text-sm px-3 pr-10 rounded-lg border border-gray-300 bg-white text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder=""
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 flex items-center justify-center hover:text-[#282828] transition-colors hover:transform-none"
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
                  className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <span className="ml-2 text-[#282828] text-sm group-hover:text-gray-600 transition-colors duration-200">Se souvenir de moi</span>
              </label>
              <a href="/auth/forgot-password" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors duration-200 hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center group animate-slide-up border-0 bg-primary text-white hover:bg-primary-hover active:bg-primary-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all duration-200"
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-subtle-bg px-4 text-gray-500">OU</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm border border-gray-300 bg-white text-[#282828] hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow group"
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
            <p className="text-gray-600 text-sm">
              Pas encore de compte ?{' '}
              <a href="/auth/register" className="text-primary hover:text-primary-hover font-medium transition-colors duration-200 hover:underline">
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
