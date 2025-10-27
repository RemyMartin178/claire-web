/**
 * Get the backend URL from runtime configuration
 * In Electron, the backend URL is provided in runtime-config.json
 */
export async function getBackendUrl(): Promise<string> {
  try {
    const response = await fetch('/runtime-config.json')
    if (response.ok) {
      const config = await response.json()
      const backendUrl = config.API_URL || 'http://localhost:64952'
      console.log('📡 Backend URL from runtime config:', backendUrl)
      return backendUrl
    }
  } catch (error) {
    console.warn('Failed to read runtime config:', error)
  }
  
  // Default fallback
  const fallbackUrl = 'http://localhost:64952'
  console.log('📡 Using fallback backend URL:', fallbackUrl)
  return fallbackUrl
}
