import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../utils/firebase'

export interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
  renewalDate?: Date
}

export const useSubscription = (): SubscriptionStatus => {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus>(() => {
    // Try to get cached subscription from localStorage on initialization
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('subscription_cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          // Check if cache is less than 5 minutes old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            return {
              plan: parsed.plan || 'free',
              status: parsed.status || 'active',
              isActive: parsed.isActive || false,
              isLoading: false,
              renewalDate: parsed.renewalDate ? new Date(parsed.renewalDate) : undefined
            }
          }
        } catch (e) {
          // Invalid cache, ignore
        }
      }
    }
    return {
      plan: 'free',
      status: 'active',
      isActive: false,
      isLoading: true,
      renewalDate: undefined
    }
  })

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.uid) {
        setSubscription({
          plan: 'free',
          status: 'active',
          isActive: false,
          isLoading: false,
          renewalDate: undefined
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
            isLoading: false,
            renewalDate: undefined
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
          
          // Parse renewal date from subscription data
          let renewalDate: Date | undefined
          if (data.subscription?.currentPeriodEnd) {
            if (typeof data.subscription.currentPeriodEnd === 'string') {
              renewalDate = new Date(data.subscription.currentPeriodEnd)
            } else if (data.subscription.currentPeriodEnd.seconds) {
              renewalDate = new Date(data.subscription.currentPeriodEnd.seconds * 1000)
            }
          }
          
          const newSubscription = {
            plan: data.plan || 'free',
            status: data.status || 'active',
            isActive: data.isActive || false,
            isLoading: false,
            renewalDate: renewalDate
          }
          setSubscription(newSubscription)
          
          // Cache the subscription data
          if (typeof window !== 'undefined') {
            localStorage.setItem('subscription_cache', JSON.stringify({
              ...newSubscription,
              renewalDate: renewalDate?.toISOString(),
              timestamp: Date.now()
            }))
          }
        } else {
          const errorData = await response.json()
          console.error('Failed to fetch subscription status:', response.status, errorData)
          setSubscription({
            plan: 'free',
            status: 'active',
            isActive: false,
            isLoading: false,
            renewalDate: undefined
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
