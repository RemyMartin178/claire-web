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

// ─── Auth events ──────────────────────────────────────────────────────────────

/** User successfully created an account */
export const trackSignUp = (method: 'email' | 'google') =>
    gtagEvent('sign_up', { method })

/** User successfully signed in */
export const trackLogin = (method: 'email' | 'google') =>
    gtagEvent('login', { method })

/** User signed out */
export const trackLogout = () =>
    gtagEvent('logout')

/** Login attempt failed */
export const trackLoginFailed = (reason: string) =>
    gtagEvent('login_failed', { reason })

/** Account creation failed */
export const trackSignUpFailed = (reason: string) =>
    gtagEvent('sign_up_failed', { reason })

// ─── Activity / Engagement events ────────────────────────────────────────────

/** User lands on the activity page */
export const trackActivityPageView = (sessionCount: number) =>
    gtagEvent('activity_page_view', { session_count: sessionCount })

/** User opens a session detail */
export const trackSessionViewed = (sessionId: string) =>
    gtagEvent('session_viewed', { session_id: sessionId })

/** User uploads a file to knowledge base */
export const trackKnowledgeBaseUpload = (fileType?: string) =>
    gtagEvent('knowledge_base_upload', { file_type: fileType })

/** User toggles a tool on or off */
export const trackToolToggled = (toolName: string, enabled: boolean) =>
    gtagEvent('tool_toggled', { tool_name: toolName, enabled })

/** User creates an AI agent */
export const trackAgentCreated = () =>
    gtagEvent('agent_created')

/** User opens the search popup */
export const trackSearchOpened = () =>
    gtagEvent('search_opened')

/** User performs a search query */
export const trackSearchQuery = (query: string) =>
    gtagEvent('search_query', { query_length: query.length })
