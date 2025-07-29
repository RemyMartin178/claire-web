'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createUserWithEmail, signInWithGoogle } from '@/utils/auth'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setIsLoading(false)
      return
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation')
      setIsLoading(false)
      return
    }

    try {
      const displayName = `${formData.firstName} ${formData.lastName}`.trim()
      await createUserWithEmail(formData.email, formData.password, displayName)
      router.push('/accueil')
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée')
      } else if (error.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible')
      } else if (error.code === 'auth/invalid-email') {
        setError('Adresse email invalide')
      } else {
        setError('Erreur lors de la création du compte')
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
      router.push('/accueil')
    } catch (error: any) {
      setError('Erreur lors de la connexion avec Google')
      console.error('Google sign in error:', error)
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Claire</h1>
          <p className="text-gray-600">Assistant IA intelligent</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">Créer un compte</h2>
            <p className="text-gray-600 text-sm">Rejoignez Claire et commencez votre essai gratuit</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-black mb-1">
                  Prénom
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-500 text-sm transition-all"
                    placeholder="Jean"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-black mb-1">
                  Nom
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-500 text-sm transition-all"
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-500 text-sm transition-all"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-500 text-sm transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-1">
                  Confirmer
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-500 text-sm transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
                  required
                />
                <span className="ml-2 text-black text-xs">
                  J'accepte les{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                    conditions d'utilisation
                  </a>{' '}
                  et la{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                    politique de confidentialité
                  </a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {isLoading ? 'Création...' : 'Créer mon compte'}
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-500">OU</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black text-sm bg-white disabled:opacity-50"
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
            <p className="text-gray-600 text-sm">
              Déjà un compte ?{' '}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Se connecter
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 