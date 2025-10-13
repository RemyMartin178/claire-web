import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
}

export const useSubscription = (): SubscriptionStatus => {
  const { userInfo } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    plan: 'free',
    status: 'active',
    isActive: false,
    isLoading: true
  })

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userInfo?.uid) {
        setSubscription({
          plan: 'free',
          status: 'active',
          isActive: false,
          isLoading: false
        })
        return
      }

      try {
        const response = await fetch('/api/user/subscription', {
          headers: {
            'Authorization': `Bearer ${await userInfo.getIdToken()}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSubscription({
            plan: data.plan || 'free',
            status: data.status || 'active',
            isActive: data.isActive || false,
            isLoading: false
          })
        } else {
          console.error('Failed to fetch subscription status')
          setSubscription({
            plan: 'free',
            status: 'active',
            isActive: false,
            isLoading: false
          })
        }
      } catch (error) {
        console.error('Error fetching subscription:', error)
        setSubscription({
          plan: 'free',
          status: 'active',
          isActive: false,
          isLoading: false
        })
      }
    }

    fetchSubscription()
  }, [userInfo?.uid])

  return subscription
}

// Helper functions
export const getSubscriptionDisplayName = (plan: 'free' | 'plus' | 'enterprise'): string => {
  switch (plan) {
    case 'free':
      return 'Claire Gratuit'
    case 'plus':
      return 'Claire Plus'
    case 'enterprise':
      return 'Claire Enterprise'
    default:
      return 'Claire Gratuit'
  }
}

export const isPremiumFeature = (plan: 'free' | 'plus' | 'enterprise'): boolean => {
  return plan === 'plus' || plan === 'enterprise'
}
