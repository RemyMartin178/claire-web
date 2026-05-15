'use client'

import { posthogEvent } from './posthog'

const REVENUECAT_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
const PRO_ENTITLEMENT_ID = process.env.NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID || 'pro'

let configuredForUser: string | null = null

async function getPurchases() {
  const mod = await import('@revenuecat/purchases-js')
  return mod.Purchases
}

export function isRevenueCatConfigured() {
  return Boolean(REVENUECAT_API_KEY)
}

export async function configureRevenueCat(appUserId: string) {
  if (!REVENUECAT_API_KEY || !appUserId || typeof window === 'undefined') return null

  const Purchases = await getPurchases()
  if (configuredForUser === appUserId && Purchases.isConfigured()) {
    return Purchases.getSharedInstance()
  }

  if (Purchases.isConfigured()) {
    try { Purchases.getSharedInstance().close() } catch { /* noop */ }
  }

  configuredForUser = appUserId
  const purchases = Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserId,
  })
  posthogEvent('revenuecat_configured')
  return purchases
}

export async function getRevenueCatCustomerInfo(appUserId: string) {
  const purchases = await configureRevenueCat(appUserId)
  if (!purchases) return null
  return purchases.getCustomerInfo()
}

export async function hasRevenueCatEntitlement(appUserId: string, entitlementId = PRO_ENTITLEMENT_ID) {
  const customerInfo = await getRevenueCatCustomerInfo(appUserId)
  return Boolean(customerInfo?.entitlements?.active?.[entitlementId])
}

export async function presentRevenueCatPaywall(appUserId: string, offeringIdentifier?: string) {
  const purchases = await configureRevenueCat(appUserId)
  if (!purchases) {
    throw new Error('RevenueCat is not configured')
  }

  posthogEvent('revenuecat_paywall_opened', { offering: offeringIdentifier || 'current' })
  const result = await purchases.presentPaywall({
    offering: offeringIdentifier || 'current',
  } as any)
  posthogEvent('revenuecat_paywall_completed', { offering: offeringIdentifier || 'current' })
  return result
}

export async function getRevenueCatOfferings(appUserId: string) {
  const purchases = await configureRevenueCat(appUserId)
  if (!purchases) return null
  return purchases.getOfferings()
}
