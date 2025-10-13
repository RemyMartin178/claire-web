'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Download, ArrowRight } from 'lucide-react'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const sessionId = searchParams.get('session_id')
  const plan = searchParams.get('plan') || 'Plus'

  useEffect(() => {
    // Countdown timer before redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true)
          clearInterval(timer)
          // Redirect to app or billing page
          window.location.href = 'claire://billing-success'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleRedirectToApp = () => {
    setIsRedirecting(true)
    window.location.href = 'claire://billing-success'
  }

  const handleRedirectToWeb = () => {
    router.push('/settings/billing')
  }

  return (
    <Page>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="bg-white shadow-xl">
            <CardContent className="p-8 text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6 animate-pulse">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              {/* Success Message */}
              <h2 className="text-2xl font-heading font-bold text-[#282828] mb-4">
                🎉 Paiement réussi !
              </h2>
              
              <p className="text-gray-600 mb-6">
                Votre abonnement <strong>Claire {plan}</strong> a été activé avec succès.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  ✅ Votre compte a été mis à niveau automatiquement
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Vous pouvez maintenant profiter de toutes les fonctionnalités Premium
                </p>
              </div>

              {/* Countdown */}
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Redirection automatique vers l'application dans {countdown} secondes...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(5 - countdown) * 20}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleRedirectToApp}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                  disabled={isRedirecting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isRedirecting ? 'Redirection...' : 'Ouvrir Claire'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <Button 
                  onClick={handleRedirectToWeb}
                  variant="outline"
                  className="w-full text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Gérer mon abonnement
                </Button>
              </div>

              {/* Session Info (for debugging) */}
              {sessionId && (
                <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-500">
                    Session ID: {sessionId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  )
}
