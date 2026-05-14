import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../utils/firebase'

export interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'max' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
  renewalDate?: Date
  billingCycle?: 'monthly' | 'yearly'
  cancelAtPeriodEnd?: boolean
  stripeSubscriptionId?: string
  stripeCustomerId?: string | { id: string }
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
               renewalDate: parsed.renewalDate ? new Date(parsed.renewalDate) : undefined,
               billingCycle: parsed.billingCycle || undefined,
               cancelAtPeriodEnd: parsed.cancelAtPeriodEnd || false,
               stripeSubscriptionId: parsed.stripeSubscriptionId || undefined,
               stripeCustomerId: parsed.stripeCustomerId || undefined
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
       renewalDate: undefined,
       billingCycle: undefined,
       cancelAtPeriodEnd: false,
       stripeSubscriptionId: undefined,
       stripeCustomerId: undefined
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
           renewalDate: undefined,
           billingCycle: undefined,
           cancelAtPeriodEnd: false,
           stripeSubscriptionId: undefined,
           stripeCustomerId: undefined
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
            renewalDate: undefined,
            billingCycle: undefined,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: undefined
          })
          return
        }

        const token = await currentUser.getIdToken()

        const response = await fetch('/api/user/subscription', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()

           // Parse renewal date and billing cycle from subscription data
           let renewalDate: Date | undefined
           let billingCycle: 'monthly' | 'yearly' | undefined
           let cancelAtPeriodEnd: boolean = false

           if (data.subscription?.currentPeriodEnd) {
             if (typeof data.subscription.currentPeriodEnd === 'string') {
               renewalDate = new Date(data.subscription.currentPeriodEnd)
             } else if (data.subscription.currentPeriodEnd.seconds) {
               renewalDate = new Date(data.subscription.currentPeriodEnd.seconds * 1000)
             } else if (data.subscription.currentPeriodEnd._seconds) {
               renewalDate = new Date(data.subscription.currentPeriodEnd._seconds * 1000)
             } else if (data.subscription.currentPeriodEnd.toDate) {
               renewalDate = data.subscription.currentPeriodEnd.toDate()
             }
           }
           // Removed: fallback updatedAt+1month was showing stale/wrong dates

           // Detect billing cycle from period length
           if (data.subscription?.stripeSubscriptionId && data.subscription.currentPeriodEnd && renewalDate) {
             const now = new Date()
             const daysDifference = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
             if (daysDifference <= 35) billingCycle = 'monthly'
             else if (daysDifference >= 300) billingCycle = 'yearly'
           }

           // Get cancel at period end flag
           cancelAtPeriodEnd = data.subscription?.cancelAtPeriodEnd || false
          
          const newSubscription = {
            plan: data.plan || 'free',
            status: data.status || 'active',
            isActive: data.isActive || false,
            isLoading: false,
            renewalDate: renewalDate,
            billingCycle: billingCycle,
            cancelAtPeriodEnd: cancelAtPeriodEnd,
            stripeSubscriptionId: data.subscription?.stripeSubscriptionId,
            stripeCustomerId: data.subscription?.stripeCustomerId
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
           setSubscription({
             plan: 'free',
             status: 'active',
             isActive: false,
             isLoading: false,
             renewalDate: undefined,
             billingCycle: undefined,
             cancelAtPeriodEnd: false,
             stripeSubscriptionId: undefined
           })
         }
       } catch {
         setSubscription({
           plan: 'free',
           status: 'active',
           isActive: false,
           isLoading: false,
           renewalDate: undefined,
           billingCycle: undefined,
           cancelAtPeriodEnd: false,
           stripeSubscriptionId: undefined,
           stripeCustomerId: undefined
         })
       }
    }

    fetchSubscription()
  }, [user?.uid])

  return subscription
}

// Helper functions
export const getSubscriptionDisplayName = (plan: 'free' | 'plus' | 'max' | 'enterprise'): string => {
  switch (plan) {
    case 'free':
      return 'Claire Gratuit'
    case 'plus':
      return 'Claire Pro'
    case 'max':
      return 'Claire Max'
    case 'enterprise':
      return 'Claire Enterprise'
    default:
      return 'Claire Gratuit'
  }
}

export const isPremiumFeature = (plan: 'free' | 'plus' | 'max' | 'enterprise'): boolean => {
  return plan === 'plus' || plan === 'max' || plan === 'enterprise'
}
