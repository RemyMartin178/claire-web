'use client'

import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === 'undefined' || !POSTHOG_KEY) return false

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: true,
    loaded: () => {
      initialized = true
    },
  })

  initialized = true
  return true
}

export function identifyPostHog(user: { uid: string; email?: string; display_name?: string } | null) {
  if (!initPostHog() || !user?.uid) return
  posthog.identify(user.uid, {
    email: user.email,
    name: user.display_name,
  })
}

export function resetPostHog() {
  if (!initialized) return
  posthog.reset()
}

export function posthogPageview(url: string) {
  if (!initPostHog()) return
  posthog.capture('$pageview', { $current_url: url })
}

export function posthogEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!initPostHog()) return
  posthog.capture(event, properties)
}

export function isPostHogConfigured() {
  return Boolean(POSTHOG_KEY)
}
