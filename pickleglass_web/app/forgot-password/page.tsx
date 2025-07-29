'use client'

import { useEffect } from 'react'

export default function ForgotPasswordPage() {
  useEffect(() => {
    // Redirection automatique vers app.clairia.app
    window.location.href = 'https://app.clairia.app/forgot-password'
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection vers l'application...</p>
      </div>
    </div>
  )
} 