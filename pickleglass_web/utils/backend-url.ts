/**
 * Get the backend URL from runtime configuration
 * In Electron, the backend URL is provided in runtime-config.json
 */
export async function getBackendUrl(): Promise<string> {
  // 1) Prefer explicit env var in web builds
  if (typeof process !== 'undefined') {
    const envUrl = (process as any).env?.NEXT_PUBLIC_BACKEND_URL
    if (envUrl) {
      return envUrl
    }
  }

  // 2) Try runtime-config.json (Electron / server-served file)
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

  // 3) Fallback local
  const fallbackUrl = 'http://localhost:64952'
  console.log('📡 Using fallback backend URL:', fallbackUrl)
  return fallbackUrl
}
