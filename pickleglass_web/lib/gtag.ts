// Google Analytics 4 helper
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-BYXJCRZ9EZ'

declare global {
    interface Window {
        gtag: (...args: any[]) => void
        dataLayer: any[]
    }
}

/** Track a page view */
export const pageview = (url: string) => {
    if (typeof window === 'undefined' || !window.gtag) return
    window.gtag('config', GA_TRACKING_ID, { page_path: url })
}

/** Send a custom event to GA4 */
export const gtagEvent = (action: string, params: Record<string, any> = {}) => {
    if (typeof window === 'undefined' || !window.gtag) return
    window.gtag('event', action, params)
}

// ─── Billing / Facturation events ────────────────────────────────────────────

/** User lands on the billing page */
export const trackBillingPageView = (currentPlan: string) =>
    gtagEvent('billing_page_view', { current_plan: currentPlan })

/** User switches billing cycle toggle (monthly ↔ yearly) */
export const trackBillingCycleChanged = (cycle: 'monthly' | 'yearly') =>
    gtagEvent('billing_cycle_changed', { cycle })

/** User clicks a plan CTA button */
export const trackPlanClick = (plan: string, cycle: string) =>
    gtagEvent('plan_click', { plan, cycle })

/** Stripe Checkout session opened (redirect is about to happen) */
export const trackCheckoutStarted = (plan: string, cycle: string, priceEuros: number) =>
    gtagEvent('checkout_started', {
        plan,
        cycle,
        value: priceEuros,
        currency: 'EUR',
    })

/** Payment succeeded (Stripe returns ?success=true) */
export const trackPurchase = (plan: string, cycle: string, priceEuros: number) =>
    gtagEvent('purchase', {
        transaction_id: Date.now().toString(),
        value: priceEuros,
        currency: 'EUR',
        items: [{ item_name: `Claire ${plan} ${cycle}`, price: priceEuros }],
    })

/** Payment canceled (Stripe returns ?canceled=true) */
export const trackCheckoutAbandoned = (plan: string, cycle: string) =>
    gtagEvent('checkout_abandoned', { plan, cycle })

/** User clicks "Upgrade to annual" (monthly → yearly) */
export const trackUpgradeToAnnualClick = () =>
    gtagEvent('upgrade_to_annual_click')

/** Stripe annual upgrade confirmed */
export const trackUpgradeToAnnualSuccess = () =>
    gtagEvent('upgrade_to_annual_success')

/** User clicks "Gérer" (Stripe customer portal) */
export const trackManageSubscriptionClick = () =>
    gtagEvent('manage_subscription_click')

/** User clicks "Nous contacter" (Enterprise) */
export const trackEnterpriseContactClick = () =>
    gtagEvent('enterprise_contact_click')

/** User opens the upgrade modal */
export const trackUpgradeModalOpen = (fromCycle: string) =>
    gtagEvent('upgrade_modal_opened', { from_cycle: fromCycle })

/** User closes / cancels the upgrade modal */
export const trackUpgradeModalDismissed = () =>
    gtagEvent('upgrade_modal_dismissed')
