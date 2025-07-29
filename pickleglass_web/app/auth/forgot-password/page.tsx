'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { sendPasswordResetEmail } from '@/utils/auth'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
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
      await sendPasswordResetEmail(email)
      setSuccess(true)
    } catch (error: any) {
      console.error('Password reset error:', error)
      if (error.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cette adresse email')
      } else if (error.code === 'auth/invalid-email') {
        setError('Adresse email invalide')
      } else {
        setError('Erreur lors de l\'envoi de l\'email de réinitialisation')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1E1E1E' }}>
        <div className="w-full max-w-md mx-auto">
          {/* Logo en haut à gauche */}
          <div className="absolute top-8 left-8 flex items-center gap-3">
            <img src="/word.png" alt="Claire Logo" className="w-16 h-16" />
            <h1 className="text-2xl font-bold text-white">Claire</h1>
          </div>
          
          {/* Succès */}
          <div className="bg-[#232329] rounded-xl shadow-lg border border-[#3a3a4a] p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-900/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email envoyé !</h2>
              <p className="text-[#bbb] text-sm">
                Nous avons envoyé un lien de réinitialisation à <strong className="text-white">{email}</strong>
              </p>
            </div>

            <div className="text-center">
              <p className="text-[#bbb] text-sm mb-4">
                Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-accent-light hover:bg-accent-light/90 text-white py-3 rounded-lg font-medium transition-all duration-200 text-sm flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1E1E1E' }}>
      <div className="w-full max-w-md mx-auto">
        {/* Logo en haut à gauche */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img src="/word.png" alt="Claire Logo" className="w-16 h-16" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        
        {/* Formulaire */}
        <div className="bg-[#232329] rounded-xl shadow-lg border border-[#3a3a4a] p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h2>
            <p className="text-[#bbb] text-sm">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2a2a32] border border-[#3a3a4a] rounded-lg focus:outline-none focus:border-accent-light focus:ring-1 focus:ring-accent-light text-white placeholder-[#bbb] text-sm transition-all"
                  placeholder="name@work-email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-light hover:bg-accent-light/90 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
              {!isLoading && (
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-accent-light hover:text-accent-light/80 text-sm font-medium flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 