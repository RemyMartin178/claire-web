/**
 * OAuth Utility Functions
 * Handle OAuth flows for integrations
 */

import { getApiHeaders } from './api'

export interface OAuthConfig {
  toolName: string
  provider?: string
  redirectUri?: string
}

export interface AuthStatus {
  authenticated: boolean
  toolName: string
  userId: string
}

type OAuthResultPayload = {
  type: 'oauth_result'
  tool?: string
  status?: 'success' | 'error' | 'cancelled'
  error?: string
}

const PROD_API_V1_BASE = 'https://backend-production-ba2c.up.railway.app/api/v1'
const FRONTEND_HOSTS = new Set([
  'app.clairia.app',
  'claire-web-production.up.railway.app',
])

function normalizeApiV1Base(value: string): string {
  const trimmed = value.replace(/\/+$/, '')
  if (/\/api\/v\d+$/i.test(trimmed)) return trimmed
  return `${trimmed}/api/v1`
}

function isBackendCandidate(value: string): boolean {
  try {
    const url = new URL(value)
    return !FRONTEND_HOSTS.has(url.hostname)
  } catch {
    return value.startsWith('/')
  }
}

function normalizeGoogleAuthUrl(value: string): string {
  const normalized = value.replace(
    /^https:\/\/accounts\.google\.com\/auth(?=[?#])/,
    'https://accounts.google.com/o/oauth2/v2/auth'
  )

  try {
    const url = new URL(normalized)
    if (url.hostname === 'accounts.google.com' && url.pathname === '/auth') {
      url.pathname = '/o/oauth2/v2/auth'
      return url.toString()
    }
  } catch {
    // Keep backend value as-is if it is not a valid absolute URL.
  }

  return normalized
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

async function getApiV1BaseCandidates(): Promise<string[]> {
  const candidates: string[] = []

  // En app packagée (protocole app://) il n'y a pas de serveur Next : les
  // routes /api/* renvoient le HTML de fallback SPA, jamais du JSON.
  if (typeof window !== 'undefined' && window.location?.origin && window.location.protocol !== 'app:') {
    candidates.push(`${window.location.origin.replace(/\/+$/, '')}/api/v1`)
  }

  if (typeof process !== 'undefined') {
    const envUrl = (process as any).env?.NEXT_PUBLIC_BACKEND_URL || (process as any).env?.NEXT_PUBLIC_API_URL
    if (envUrl) candidates.push(normalizeApiV1Base(envUrl))
  }

  try {
    const response = await fetch('/runtime-config.json', { cache: 'no-store' })
    if (response.ok) {
      const config = await response.json()
      if (config.API_URL) candidates.push(normalizeApiV1Base(config.API_URL))
    }
  } catch {
    // Runtime config is optional outside Electron.
  }

  candidates.push(PROD_API_V1_BASE)
  return unique(candidates).filter(isBackendCandidate)
}

// Fetch JSON sur l'API v1 backend en essayant les bases candidates dans
// l'ordre. Réutilisable hors OAuth (ex. liste des appareils du Settings modal).
export async function fetchApiV1Json<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchToolJson<T>(path, init)
}

async function fetchToolJson<T>(path: string, init?: RequestInit): Promise<T> {
  const bases = await getApiV1BaseCandidates()
  let lastError: Error | null = null

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, init)
      if (response.ok) return await response.json()
      lastError = new Error(`OAuth backend returned ${response.status}`)
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error('OAuth backend unavailable')
}

async function fetchToolEmpty(path: string, init?: RequestInit): Promise<void> {
  const bases = await getApiV1BaseCandidates()
  let lastError: Error | null = null

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, init)
      if (response.ok) return
      lastError = new Error(`OAuth backend returned ${response.status}`)
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error('OAuth backend unavailable')
}

/**
 * Get OAuth authorization URL for a tool
 */
type AuthUrlResponse = {
  authUrl?: string
  auth_url?: string
  url?: string
  authorizationUrl?: string
  authorization_url?: string
}

export async function getAuthUrl(config: OAuthConfig, userId: string): Promise<string> {
  const isElectron = typeof window !== 'undefined' && ((window as any).api || /Electron/i.test(navigator.userAgent))
  const params = new URLSearchParams({ userId })

  if (config.provider) params.set('provider', config.provider)
  if (config.redirectUri) params.set('redirect_uri', config.redirectUri)
  if (isElectron) params.set('platform', 'desktop')

  const data = await fetchToolJson<AuthUrlResponse>(
    `/tools/${encodeURIComponent(config.toolName)}/auth/authorize?${params.toString()}`,
    { headers: await getApiHeaders() }
  )

  const authUrl = data.authUrl || data.auth_url || data.url || data.authorizationUrl || data.authorization_url
  if (!authUrl) throw new Error('OAuth authorization URL missing')
  return normalizeGoogleAuthUrl(authUrl)
}

/**
 * Check authentication status for a tool
 */
export async function checkAuthStatus(toolName: string, userId: string): Promise<AuthStatus> {
  const params = new URLSearchParams({ userId })
  return fetchToolJson<AuthStatus>(
    `/tools/${encodeURIComponent(toolName)}/auth/status?${params.toString()}`,
    { headers: await getApiHeaders() }
  )
}

/**
 * Revoke authentication for a tool
 */
export async function revokeAuth(toolName: string, userId: string): Promise<void> {
  const params = new URLSearchParams({ userId })
  await fetchToolEmpty(`/tools/${encodeURIComponent(toolName)}/auth?${params.toString()}`, {
    method: 'DELETE',
    headers: await getApiHeaders()
  })
}

/**
 * Get backend URL (helper)
 */
export async function getBackendUrl(): Promise<string> {
  return (await getApiV1BaseCandidates())[0]
}

/**
 * Open OAuth popup and wait for it to complete.
 * Uses localStorage + postMessage (COOP blocks popup.closed).
 */
export async function openOAuthPopup(config: OAuthConfig, userId: string): Promise<void> {
  const authUrl = normalizeGoogleAuthUrl(await getAuthUrl(config, userId))

  const width = 600
  const height = 700
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  const popup = window.open(
    authUrl,
    'OAuth Authorization',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
  )

  if (!popup) {
    throw new Error('Popup bloquée. Veuillez autoriser les popups pour ce site.')
  }

  // Clear any previous signals before opening
  localStorage.removeItem('oauth_success')
  localStorage.removeItem('oauth_error')
  localStorage.removeItem('oauth_result')

  return new Promise<void>((resolve, reject) => {
    let settled = false
    let broadcastChannel: BroadcastChannel | null = null
    let unsubscribeElectronOAuth: (() => void) | null = null

    function settle(success: boolean, errorMsg?: string) {
      if (settled) return
      settled = true
      cleanup()
      if (success) resolve()
      else reject(new Error(errorMsg || 'Échec de la connexion'))
    }

    // Listen for postMessage from popup (works when COOP allows it)
    const onMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return
      if (event.data.type === 'oauth_success') {
        settle(true)
        return
      }
      if (event.data.type === 'oauth_error') {
        settle(false, event.data.error)
        return
      }

      const payload = event.data as OAuthResultPayload
      if (payload.type === 'oauth_result' && payload.tool === config.toolName) {
        if (payload.status === 'success') settle(true)
        else settle(false, payload.error)
      }
    }
    window.addEventListener('message', onMessage)

    try {
      broadcastChannel = new BroadcastChannel('oauth_channel')
      broadcastChannel.onmessage = (event: MessageEvent) => {
        const payload = event.data as OAuthResultPayload
        if (!payload || payload.type !== 'oauth_result' || payload.tool !== config.toolName) return
        if (payload.status === 'success') settle(true)
        else settle(false, payload.error)
      }
    } catch {
      broadcastChannel = null
    }

    try {
      unsubscribeElectronOAuth = (window as any).api?.common?.onOAuthSuccess?.((payload: { tool?: string }) => {
        if (!payload?.tool || payload.tool === config.toolName) settle(true)
      }) || null
    } catch {
      unsubscribeElectronOAuth = null
    }

    // Poll localStorage every 300ms (primary detection, works despite COOP)
    const interval = setInterval(() => {
      const success = localStorage.getItem('oauth_success')
      if (success) {
        localStorage.removeItem('oauth_success')
        settle(true)
        return
      }
      const err = localStorage.getItem('oauth_error')
      if (err) {
        localStorage.removeItem('oauth_error')
        try { settle(false, JSON.parse(err).error) } catch { settle(false) }
        return
      }

      const result = localStorage.getItem('oauth_result')
      if (result) {
        localStorage.removeItem('oauth_result')
        try {
          const payload = JSON.parse(result) as OAuthResultPayload
          if (payload.tool !== config.toolName) return
          if (payload.status === 'success') settle(true)
          else settle(false, payload.error)
        } catch {
          settle(false)
        }
      }

      try {
        if (popup.closed) {
          // Some OAuth providers finish on a different frontend origin, so the
          // popup close can be the only reliable signal. The caller verifies
          // the real auth status immediately after this resolves.
          settle(true)
        }
      } catch {
        // Some cross-origin popup policies hide popup.closed. The timeout remains as fallback.
      }
    }, 300)

    // Safety timeout after 5 minutes (user walked away)
    const timeout = setTimeout(() => {
      settle(false, 'La fenêtre a été fermée')
    }, 5 * 60 * 1000)

    function cleanup() {
      clearInterval(interval)
      clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      broadcastChannel?.close()
      unsubscribeElectronOAuth?.()
    }
  })
}



