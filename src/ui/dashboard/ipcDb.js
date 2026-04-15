/**
 * Firestore helpers via IPC — main process is already authenticated.
 * Same public API as db.js so pages can swap the import.
 */

export async function getSessions(uid) {
  const res = await window.api.dashboard.getSessions(uid)
  return res.sessions || []
}

export async function getSessionWithSummary(uid, sessionId) {
  const res = await window.api.dashboard.getSession(uid, sessionId)
  return res.data || null
}

export async function deleteSession(uid, sessionId) {
  await window.api.dashboard.deleteSession(uid, sessionId)
}
