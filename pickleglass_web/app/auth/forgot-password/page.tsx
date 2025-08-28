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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#202123' }}>
        <div className="w-full max-w-md mx-auto">
          {/* Logo en haut à gauche */}
          <div className="absolute top-8 left-8 flex items-center gap-3">
            <img src="/word.png" alt="Claire Logo" className="w-16 h-16" />
            <h1 className="text-2xl font-bold text-white">Claire</h1>
          </div>
          
          {/* Succès */}
          <div className="w-full max-w-lg">
            <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-[#9ca3af]/20 border border-[#9ca3af]/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center border border-[#3a3a4a] bg-[#2a2a32] text-[#e5e5e5] hover:bg-[#3a3a4a] active:bg-[#404050] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:transform-none active:transform-none"
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#202123' }}>
      <div className="w-full max-w-md mx-auto">
        {/* Logo en haut à gauche */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img src="/word.png" alt="Claire Logo" className="w-16 h-16" />
          <h1 className="text-2xl font-bold text-white">Claire</h1>
        </div>
        
        {/* Formulaire */}
        <div className="w-full max-w-lg">
                     <div className="text-center mb-6">
             <h2 className="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h2>
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
                 <input
                   id="email"
                   name="email"
                   type="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full h-10 text-sm px-3 rounded-lg border border-[#3f3f46] bg-[#27272a] text-white placeholder-[#bbb] focus:outline-none focus:border-[#3f3f46] transition-all duration-200"
                   placeholder="exemple@email.com"
                   required
                 />
               </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center border border-[#3a3a4a] bg-[#2a2a32] text-[#e5e5e5] hover:bg-[#3a3a4a] active:bg-[#404050] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:transform-none active:transform-none"
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
              className="text-[#9ca3af] hover:text-[#e5e5e5] text-sm font-medium flex items-center justify-center mx-auto transition-colors duration-200 hover:underline"
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