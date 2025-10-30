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

/**
 * Get OAuth authorization URL for a tool
 */
export async function getAuthUrl(config: OAuthConfig, userId: string): Promise<string> {
  try {
    const headers = await getApiHeaders()
    const url = new URL('/api/v1/tools', window.location.origin)
    
    // Add user ID to headers
    const response = await fetch(`${url.origin}/api/v1/tools/${config.toolName}/auth/authorize?userId=${encodeURIComponent(userId)}${config.provider ? `&provider=${encodeURIComponent(config.provider)}` : ''}${config.redirectUri ? `&redirect_uri=${encodeURIComponent(config.redirectUri)}` : ''}`, {
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
    const backendUrl = await getBackendUrl()
    const directResponse = await fetch(`${backendUrl}/api/v1/tools/${config.toolName}/auth/authorize?userId=${encodeURIComponent(userId)}${config.provider ? `&provider=${encodeURIComponent(config.provider)}` : ''}${config.redirectUri ? `&redirect_uri=${encodeURIComponent(config.redirectUri)}` : ''}`, {
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
async function getBackendUrl(): Promise<string> {
  try {
    const response = await fetch('/runtime-config.json')
    if (response.ok) {
      const config = await response.json()
      return config.API_URL || 'http://localhost:64952'
    }
  } catch (error) {
    console.warn('Failed to fetch runtime config')
  }
  return 'http://localhost:64952'
}

/**
 * Open OAuth popup and handle callback
 */
export async function openOAuthPopup(config: OAuthConfig, userId: string): Promise<void> {
  try {
    const authUrl = await getAuthUrl(config, userId)
    
    // Open popup
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
      throw new Error('Popup blocked. Please allow popups for this site.')
    }
    
    // Wait for popup to close (handled by callback redirect)
    // The callback will redirect to /tools with success/error params
  } catch (error) {
    console.error('Failed to open OAuth popup:', error)
    throw error
  }
}

