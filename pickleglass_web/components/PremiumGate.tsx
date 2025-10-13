'use client'

import React from 'react'
import { Crown, Lock } from 'lucide-react'
import { useSubscription, isPremiumFeature } from '@/hooks/useSubscription'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PremiumGateProps {
  children: React.ReactNode
  feature: string
  plan?: 'plus' | 'enterprise'
  showUpgrade?: boolean
  className?: string
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  feature,
  plan = 'plus',
  showUpgrade = true,
  className = ''
}) => {
  const subscription = useSubscription()

  // Si l'utilisateur a le bon plan ou mieux, afficher le contenu
  if (subscription.isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const hasAccess = subscription.plan === plan || 
                   (plan === 'plus' && subscription.plan === 'enterprise') ||
                   subscription.plan === 'enterprise'

  if (hasAccess) {
    return <>{children}</>
  }

  // Afficher le gate Premium
  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[#282828] mb-2">
            Fonctionnalité Premium
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {feature} est disponible avec Claire {plan === 'plus' ? 'Plus' : 'Enterprise'}
          </p>
        </div>

        {showUpgrade && (
          <div className="space-y-3">
            <Link href="/settings/billing">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                <Crown className="h-4 w-4 mr-2" />
                Passer à Claire {plan === 'plus' ? 'Plus' : 'Enterprise'}
              </Button>
            </Link>
            
            <p className="text-xs text-gray-500">
              Débloquez toutes les fonctionnalités avancées
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PremiumFeatureProps {
  feature: string
  plan?: 'plus' | 'enterprise'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  feature,
  plan = 'plus',
  children,
  fallback
}) => {
  const subscription = useSubscription()

  if (subscription.isLoading) {
    return fallback || <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
  }

  const hasAccess = subscription.plan === plan || 
                   (plan === 'plus' && subscription.plan === 'enterprise') ||
                   subscription.plan === 'enterprise'

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
        <div className="text-center">
          <Lock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Fonctionnalité {plan === 'plus' ? 'Plus' : 'Enterprise'}
          </p>
          <Link href="/settings/billing">
            <Button size="sm" variant="outline">
              Débloquer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
