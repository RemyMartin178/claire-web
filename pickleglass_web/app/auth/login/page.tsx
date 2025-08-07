'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signInWithGoogle, signInWithEmail } from '@/utils/auth'
import { handleFirebaseError, shouldLogError } from '@/utils/errorHandler'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
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

  // Redirection si déjà connecté
  if (user) {
    router.push('/accueil')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signInWithEmail(formData.email, formData.password)
      sessionStorage.removeItem('manuallyLoggedOut')
      router.push('/accueil')
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      await signInWithGoogle()
      sessionStorage.removeItem('manuallyLoggedOut')
      router.push('/accueil')
    } catch (error: any) {
      const errorMessage = handleFirebaseError(error)
      setError(errorMessage)
      
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#202123' }}>
      <div className="w-full max-w-md mx-auto">
        {/* Logo en haut à gauche */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img src="/word.png" alt="Claire Logo" className="w-16 h-16" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        
        {/* Formulaire */}
        <div className="bg-[#232329] rounded-xl shadow-lg border border-[#3a3a4a] p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur Claire</h2>
            <p className="text-[#bbb] text-sm">Connectez-vous à votre compte pour continuer</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2a2a32] border border-[#3a3a4a] rounded-lg focus:outline-none focus:border-accent-light focus:ring-1 focus:ring-accent-light text-white placeholder-[#bbb] text-sm transition-all"
                  placeholder="name@work-email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#bbb] w-4 h-4" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 bg-[#2a2a32] border border-[#3a3a4a] rounded-lg focus:outline-none focus:border-accent-light focus:ring-1 focus:ring-accent-light text-white placeholder-[#bbb] text-sm transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#bbb] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-accent-light bg-[#2a2a32] border-[#3a3a4a] rounded focus:ring-accent-light focus:ring-2"
                />
                <span className="ml-2 text-white text-sm">Se souvenir de moi</span>
              </label>
              <a href="/auth/forgot-password" className="text-accent-light hover:text-accent-light/80 text-sm font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-light hover:bg-accent-light/90 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {isLoading ? 'Connexion...' : 'Continuer'}
              {!isLoading && (
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3a3a4a]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#232329] px-3 text-[#bbb]">OU</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-[#3a3a4a] rounded-lg hover:bg-[#2a2a32] transition-colors text-white text-sm bg-[#232329] disabled:opacity-50"
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

          <div className="mt-6 text-center">
            <p className="text-[#bbb] text-sm">
              Pas encore de compte ?{' '}
              <a href="/auth/register" className="text-accent-light hover:text-accent-light/80 font-medium">
                Créer un compte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 