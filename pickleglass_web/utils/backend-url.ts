/**
 * Get the backend URL from runtime configuration
 * In Electron, the backend URL is provided in runtime-config.json
 */
export async function getBackendUrl(): Promise<string> {
  try {
    const response = await fetch('/runtime-config.json')
    if (response.ok) {
      const config = await response.json()
      return config.API_URL || 'http://localhost:64952'
    }
  } catch (error) {
    console.warn('Failed to read runtime config:', error)
  }
  
  // Default fallback
  return 'http://localhost:64952'
}
