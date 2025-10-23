import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../utils/firebase'

export interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
  renewalDate?: Date
  billingCycle?: 'monthly' | 'yearly'
  cancelAtPeriodEnd?: boolean
  stripeSubscriptionId?: string
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
               stripeSubscriptionId: parsed.stripeSubscriptionId || undefined
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
       stripeSubscriptionId: undefined
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
           stripeSubscriptionId: undefined
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
          
           // Parse renewal date and billing cycle from subscription data
           let renewalDate: Date | undefined
           let billingCycle: 'monthly' | 'yearly' | undefined
           let cancelAtPeriodEnd: boolean = false
           
           console.log('Parsing renewal date from:', data.subscription?.currentPeriodEnd)
           if (data.subscription?.currentPeriodEnd) {
             if (typeof data.subscription.currentPeriodEnd === 'string') {
               renewalDate = new Date(data.subscription.currentPeriodEnd)
               console.log('Parsed date from string:', renewalDate)
             } else if (data.subscription.currentPeriodEnd.seconds) {
               renewalDate = new Date(data.subscription.currentPeriodEnd.seconds * 1000)
               console.log('Parsed date from timestamp:', renewalDate)
             } else if (data.subscription.currentPeriodEnd._seconds) {
               renewalDate = new Date(data.subscription.currentPeriodEnd._seconds * 1000)
               console.log('Parsed date from _seconds:', renewalDate)
             } else if (data.subscription.currentPeriodEnd.toDate) {
               renewalDate = data.subscription.currentPeriodEnd.toDate()
               console.log('Parsed date from toDate():', renewalDate)
             }
           } else if (data.subscription?.updatedAt) {
             // Fallback: calculate renewal date from last update + 1 month
             let updateDate: Date
             if (typeof data.subscription.updatedAt === 'string') {
               updateDate = new Date(data.subscription.updatedAt)
             } else if (data.subscription.updatedAt.seconds) {
               updateDate = new Date(data.subscription.updatedAt.seconds * 1000)
             } else if (data.subscription.updatedAt._seconds) {
               updateDate = new Date(data.subscription.updatedAt._seconds * 1000)
             } else if (data.subscription.updatedAt.toDate) {
               updateDate = data.subscription.updatedAt.toDate()
             } else {
               updateDate = new Date()
             }
             
             // Add 1 month to the update date
             renewalDate = new Date(updateDate)
             renewalDate.setMonth(renewalDate.getMonth() + 1)
             console.log('Calculated renewal date from update date:', renewalDate)
           } else {
             console.log('No currentPeriodEnd or updatedAt found in subscription data')
           }

           // Detect billing cycle from subscription data
           if (data.subscription?.stripeSubscriptionId) {
             // If we have Stripe data, try to detect cycle from price ID or period
             if (data.subscription.currentPeriodEnd && renewalDate) {
               const now = new Date()
               const periodLength = renewalDate.getTime() - now.getTime()
               const daysDifference = Math.ceil(periodLength / (1000 * 60 * 60 * 24))
               
               // If period is ~30 days = monthly, ~365 days = yearly
               if (daysDifference <= 35) {
                 billingCycle = 'monthly'
               } else if (daysDifference >= 300) {
                 billingCycle = 'yearly'
               }
               console.log('Detected billing cycle:', billingCycle, 'from period length:', daysDifference, 'days')
             }
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
            stripeSubscriptionId: data.subscription?.stripeSubscriptionId
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
             renewalDate: undefined,
             billingCycle: undefined,
             cancelAtPeriodEnd: false,
             stripeSubscriptionId: undefined
           })
         }
       } catch (error) {
         console.error('Error fetching subscription:', error)
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
