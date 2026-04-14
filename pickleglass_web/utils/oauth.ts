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

/**
 * Get OAuth authorization URL for a tool
 */
export async function getAuthUrl(config: OAuthConfig, userId: string): Promise<string> {
  try {
    const isElectron = typeof window !== 'undefined' && ((window as any).api || /Electron/i.test(navigator.userAgent))
    const headers = await getApiHeaders()
    const backendUrl = await getBackendUrl()

    // Add user ID and platform to query backend
    const platformParam = isElectron ? '&platform=desktop' : ''
    const response = await fetch(`${backendUrl}/api/v1/tools/${config.toolName}/auth/authorize?userId=${encodeURIComponent(userId)}${config.provider ? `&provider=${encodeURIComponent(config.provider)}` : ''}${config.redirectUri ? `&redirect_uri=${encodeURIComponent(config.redirectUri)}` : ''}${platformParam}`, {
      headers
    })

    if (!response.ok) {
      throw new Error('Failed to get auth URL')
    }

    const data = await response.json()
    return data.authUrl
  } catch (error) {
    console.error('Failed to get auth URL:', error)

    // Fallback: try direct backend
    const isElectron = typeof window !== 'undefined' && /Electron/i.test(navigator.userAgent)
    const platformParam = isElectron ? '&platform=desktop' : ''
    const backendUrl = await getBackendUrl()
    const directResponse = await fetch(`${backendUrl}/api/v1/tools/${config.toolName}/auth/authorize?userId=${encodeURIComponent(userId)}${config.provider ? `&provider=${encodeURIComponent(config.provider)}` : ''}${config.redirectUri ? `&redirect_uri=${encodeURIComponent(config.redirectUri)}` : ''}${platformParam}`, {
      headers: await getApiHeaders()
    })

    if (!directResponse.ok) {
      throw new Error('Failed to get auth URL from backend')
    }

    const data = await directResponse.json()
    return data.authUrl
  }
}

/**
 * Check authentication status for a tool
 */
export async function checkAuthStatus(toolName: string, userId: string): Promise<AuthStatus> {
  try {
    const headers = await getApiHeaders()

    const response = await fetch(`/api/v1/tools/${toolName}/auth/status?userId=${encodeURIComponent(userId)}`, {
      headers
    })

    if (!response.ok) {
      throw new Error('Failed to check auth status')
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to check auth status:', error)

    // Fallback: try direct backend
    const backendUrl = await getBackendUrl()
    const directResponse = await fetch(`${backendUrl}/api/v1/tools/${toolName}/auth/status?userId=${encodeURIComponent(userId)}`, {
      headers: await getApiHeaders()
    })

    if (!directResponse.ok) {
      throw new Error('Failed to check auth status from backend')
    }

    return await directResponse.json()
  }
}

/**
 * Revoke authentication for a tool
 */
export async function revokeAuth(toolName: string, userId: string): Promise<void> {
  try {
    const headers = await getApiHeaders()

    const response = await fetch(`/api/v1/tools/${toolName}/auth?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      throw new Error('Failed to revoke auth')
    }
  } catch (error) {
    console.error('Failed to revoke auth:', error)

    // Fallback: try direct backend
    const backendUrl = await getBackendUrl()
    const directResponse = await fetch(`${backendUrl}/api/v1/tools/${toolName}/auth?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: await getApiHeaders()
    })

    if (!directResponse.ok) {
      throw new Error('Failed to revoke auth from backend')
    }
  }
}

/**
 * Get backend URL (helper)
 */
export async function getBackendUrl(): Promise<string> {
  // If we're fully in a browser window on localhost, force relative paths 
  // so Next.js rewrites (next.config.js) can proxy without triggering CSP blocks.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '';
  }

  // Fallback to fetch config if on a real domain
  try {
    const response = await fetch('/runtime-config.json')
    if (response.ok) {
      const config = await response.json()
      return config.API_URL || 'http://localhost:3001'
    }
  } catch (error) {
    console.warn('Failed to fetch runtime config')
  }
  return 'http://localhost:3001'
}

/**
 * Open OAuth popup and wait for it to complete.
 * Uses localStorage + postMessage (COOP blocks popup.closed).
 */
export async function openOAuthPopup(config: OAuthConfig, userId: string): Promise<void> {
  const authUrl = await getAuthUrl(config, userId)

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
    }, 300)

    // Safety timeout after 5 minutes (user walked away)
    const timeout = setTimeout(() => {
      settle(false, 'La fenêtre a été fermée')
    }, 5 * 60 * 1000)

    function cleanup() {
      clearInterval(interval)
      clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
    }
  })
}



