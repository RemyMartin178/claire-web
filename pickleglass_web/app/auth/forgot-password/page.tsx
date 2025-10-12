'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { sendPasswordResetEmail } from '@/utils/auth'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  if (user) {
    router.push('/activity')
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-subtle-bg">
        <div className="w-full max-w-md mx-auto">
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#282828] mb-2">Email envoyé !</h2>
              <p className="text-gray-600 text-sm">
                Nous avons envoyé un lien de réinitialisation à <strong className="text-[#282828]">{email}</strong>
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center border border-gray-300 bg-white text-[#282828] hover:bg-gray-50 focus:outline-none shadow-sm hover:shadow transition-all duration-200"
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-subtle-bg">
      <div className="w-full max-w-md mx-auto">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#282828] mb-2">Mot de passe oublié ?</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#282828] mb-1">
                Adresse email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 text-sm px-3 rounded-lg border border-gray-300 bg-white text-[#282828] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder="exemple@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center border-0 bg-primary text-white hover:bg-primary-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all duration-200"
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
              className="text-primary hover:text-primary-hover text-sm font-medium flex items-center justify-center mx-auto transition-colors duration-200 hover:underline"
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
