// IPC helpers — window.api is injected by Electron's preload script
const api = () => window?.api?.dashboard

export const isElectron = () => typeof window !== 'undefined' && !!window?.api?.dashboard

export const getUser = () => api()?.getUser?.()
export const getSessions = (uid) => api()?.getSessions?.(uid)
export const getSession = (uid, sessionId) => api()?.getSession?.(uid, sessionId)
export const deleteSession = (uid, sessionId) => api()?.deleteSession?.(uid, sessionId)
export const startClaire = () => api()?.startClaire?.()
export const onUserChanged = (cb) => api()?.onUserChanged?.(cb)
export const removeUserChanged = (cb) => api()?.removeUserChanged?.(cb)
export const startExternalAuth = () => window?.api?.common?.startFirebaseAuth?.()
export const openExternal = (url) => window?.api?.common?.openExternal?.(url)

const RAILWAY_URL = 'https://backend-production-ba2c.up.railway.app'

export async function getApiHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const res = await getUser()
    if (res?.token) headers['Authorization'] = `Bearer ${res.token}`
  } catch (_) {}
  return headers
}

export async function fetchCalendarStatus(uid) {
  const headers = await getApiHeaders()
  const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth/status?userId=${encodeURIComponent(uid)}`, { headers })
  return res.ok ? res.json() : null
}

export async function fetchCalendarEvents(uid) {
  const headers = await getApiHeaders()
  const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/execute?userId=${encodeURIComponent(uid)}`, {
    method: 'POST', headers,
    body: JSON.stringify({ parameters: { operation: 'listEvents', maxResults: 50, userId: uid } }),
  })
  if (!res.ok) return []
  const data = await res.json()
  const evts = data.result?.events || data.events || []
  return Array.isArray(evts) ? evts : []
}

export async function connectCalendar(uid) {
  const headers = await getApiHeaders()
  const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth?userId=${encodeURIComponent(uid)}`, { headers })
  const data = await res.json()
  if (data.authUrl) window.open(data.authUrl, '_blank')
}

export async function disconnectCalendar(uid) {
  const headers = await getApiHeaders()
  await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth/revoke?userId=${encodeURIComponent(uid)}`, { method: 'POST', headers })
}
