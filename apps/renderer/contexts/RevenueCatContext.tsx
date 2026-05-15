'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  getRevenueCatCustomerInfo,
  hasRevenueCatEntitlement,
  isRevenueCatConfigured,
  presentRevenueCatPaywall,
} from '@/lib/revenuecat'

type RevenueCatContextValue = {
  configured: boolean
  loading: boolean
  customerInfo: any | null
  hasPro: boolean
  refresh: () => Promise<void>
  presentPaywall: (offeringIdentifier?: string) => Promise<unknown>
}

const RevenueCatContext = createContext<RevenueCatContextValue>({
  configured: false,
  loading: false,
  customerInfo: null,
  hasPro: false,
  refresh: async () => {},
  presentPaywall: async () => null,
})

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [customerInfo, setCustomerInfo] = useState<any | null>(null)
  const [hasPro, setHasPro] = useState(false)
  const [loading, setLoading] = useState(false)
  const configured = isRevenueCatConfigured()

  const refresh = useCallback(async () => {
    if (!configured || !user?.uid) {
      setCustomerInfo(null)
      setHasPro(false)
      return
    }

    setLoading(true)
    try {
      const info = await getRevenueCatCustomerInfo(user.uid)
      setCustomerInfo(info)
      setHasPro(await hasRevenueCatEntitlement(user.uid))
    } catch {
      setCustomerInfo(null)
      setHasPro(false)
    } finally {
      setLoading(false)
    }
  }, [configured, user?.uid])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const presentPaywall = useCallback(async (offeringIdentifier?: string) => {
    if (!configured || !user?.uid) {
      throw new Error('RevenueCat is not configured')
    }
    const result = await presentRevenueCatPaywall(user.uid, offeringIdentifier)
    await refresh()
    return result
  }, [configured, refresh, user?.uid])

  return (
    <RevenueCatContext.Provider value={{ configured, loading, customerInfo, hasPro, refresh, presentPaywall }}>
      {children}
    </RevenueCatContext.Provider>
  )
}

export function useRevenueCat() {
  return useContext(RevenueCatContext)
}
