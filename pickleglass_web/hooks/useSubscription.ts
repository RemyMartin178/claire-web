import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../utils/firebase'

export interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
}

export const useSubscription = (): SubscriptionStatus => {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    plan: 'free',
    status: 'active',
    isActive: false,
    isLoading: true
  })

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.uid) {
        setSubscription({
          plan: 'free',
          status: 'active',
          isActive: false,
          isLoading: false
        })
        return
      }

      try {
        // Get Firebase auth token from current user
        const currentUser = auth.currentUser
        if (!currentUser) {
          setSubscription({
            plan: 'free',
            status: 'active',
            isActive: false,
            isLoading: false
          })
          return
        }

        const token = await currentUser.getIdToken()
        console.log('Token obtained, length:', token.length)
        
        const response = await fetch('/api/user/subscription', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Subscription data received:', data)
          setSubscription({
            plan: data.plan || 'free',
            status: data.status || 'active',
            isActive: data.isActive || false,
            isLoading: false
          })
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch subscription status:', response.status, errorData)
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
  }, [user?.uid])

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
