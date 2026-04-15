import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../DashboardApp.jsx'
import { getApiHeaders, RAILWAY_URL } from '../DashboardApp.jsx'
import {
  getEventStartDate, getEventTitle,
  formatDateHeading, formatDurationLabel, formatTimeLabel
} from './calendarUtils.js'

const SpinnerIcon = ({ size = 5 }) => (
  <div className={`w-${size} h-${size} border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin`} />
)

const GoogleLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
)

const RefreshIcon = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={spinning ? { animation: 'spin 0.8s linear infinite' } : {}}>
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

const LogOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export default function CalendarPage({ navigate }) {
  const { user } = useAuth()
  const [isConfigured, setIsConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [operatingAuth, setOperatingAuth] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState(null)
  const [events, setEvents] = useState([])

  const fetchEvents = useCallback(async () => {
    if (!user) return
    setEventsLoading(true)
    try {
      const headers = await getApiHeaders()
      const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/execute?userId=${encodeURIComponent(user.uid)}`, {
        method: 'POST', headers,
        body: JSON.stringify({ parameters: { operation: 'listEvents', maxResults: 50, userId: user.uid } }),
      })
      if (!res.ok) return
      const data = await res.json()
      const evts = data.result?.events || data.events || []
      const arr = Array.isArray(evts) ? evts : []
      setEvents(arr)
      sessionStorage.setItem('calendar:events', JSON.stringify(arr))
    } catch (e) { console.error('[CalendarPage] fetchEvents', e) }
    finally { setEventsLoading(false) }
  }, [user])

  const checkStatus = useCallback(async () => {
    if (!user) return
    setStatusLoading(true)
    try {
      const headers = await getApiHeaders()
      const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth/status?userId=${encodeURIComponent(user.uid)}`, { headers })
      if (!res.ok) return
      const status = await res.json()
      setIsConfigured(status.authenticated)
      if (status.accountEmail) {
        setConnectedEmail(status.accountEmail)
        sessionStorage.setItem('calendar:connectedEmail', status.accountEmail)
      } else if (status.authenticated) {
        const cached = sessionStorage.getItem('calendar:connectedEmail')
        setConnectedEmail(cached || null)
      }
      if (status.authenticated) await fetchEvents()
    } catch (e) { console.error('[CalendarPage] checkStatus', e) }
    finally { setStatusLoading(false) }
  }, [user, fetchEvents])

  useEffect(() => { checkStatus() }, [checkStatus])

  const handleConnect = async () => {
    if (!user) return
    setOperatingAuth(true)
    try {
      const headers = await getApiHeaders()
      const res = await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth?userId=${encodeURIComponent(user.uid)}`, { headers })
      const data = await res.json()
      if (data.authUrl) window.open(data.authUrl, '_blank')
    } catch (e) { console.error('[CalendarPage] connect', e) }
    finally { setOperatingAuth(false) }
  }

  const handleDisconnect = async () => {
    if (!user) return
    setOperatingAuth(true)
    try {
      const headers = await getApiHeaders()
      await fetch(`${RAILWAY_URL}/api/v1/tools/google_calendar/auth/revoke?userId=${encodeURIComponent(user.uid)}`, { method: 'POST', headers })
      setIsConfigured(false)
      setConnectedEmail(null)
      setEvents([])
      sessionStorage.removeItem('calendar:events')
    } catch (e) { console.error('[CalendarPage] disconnect', e) }
    finally { setOperatingAuth(false) }
  }

  // Group events by date heading, ascending
  const groups = {}
  events.forEach(event => {
    const start = getEventStartDate(event)
    if (!start) return
    const heading = formatDateHeading(start)
    if (!groups[heading]) groups[heading] = { label: heading, sortKey: start.getTime(), items: [] }
    groups[heading].items.push(event)
  })
  const sortedGroups = Object.values(groups).sort((a, b) => a.sortKey - b.sortKey)

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <div className="flex items-center justify-center min-h-[40vh]">
            <SpinnerIcon size={8} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#282828]">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-semibold text-black mb-2">Calendrier</h1>
        <p className="text-sm text-gray-500 mb-6">
          Les prochaines réunions sont synchronisées à partir de Google Calendar.
        </p>

        {!isConfigured ? (
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-6">Connectez votre compte Google pour synchroniser vos réunions.</p>
            <button
              onClick={handleConnect}
              disabled={operatingAuth}
              className="flex items-center gap-2 px-4 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {operatingAuth ? <SpinnerIcon size={4} /> : <GoogleLogo />}
              <span>Connecter Google</span>
            </button>
          </div>
        ) : (
          <>
            {/* Connected status bar */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <GoogleLogo />
                <span className="text-sm font-medium text-gray-700">{connectedEmail || 'Compte Google connecté'}</span>
                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchEvents}
                  disabled={eventsLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <RefreshIcon spinning={eventsLoading} />
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={operatingAuth}
                  className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <LogOutIcon />
                  Déconnecter
                </button>
              </div>
            </div>

            {/* Events */}
            {eventsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <SpinnerIcon size={4} />
                Chargement des réunions...
              </div>
            ) : sortedGroups.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Aucune réunion à venir.</p>
            ) : (
              <div className="space-y-10">
                {sortedGroups.map(group => (
                  <div key={group.label}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">{group.label}</h3>
                    <div className="space-y-0.5">
                      {group.items.map((event, idx) => {
                        const start = getEventStartDate(event)
                        const joinLink = getJoinLink(event)
                        return (
                          <div
                            key={event.id || idx}
                            className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            onClick={() => navigate('calendar-details', { event })}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-[15px] font-medium text-black truncate">{getEventTitle(event)}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                                {formatDurationLabel(event)}
                              </span>
                              <span className="text-sm font-medium text-neutral-500 w-16 text-right">
                                {formatTimeLabel(start)}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {joinLink && (
                                  <a
                                    href={joinLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                  >
                                    <VideoIcon />
                                  </a>
                                )}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function getJoinLink(event) {
  if (event.hangoutLink) return event.hangoutLink
  if (event.location && /https?:\/\//.test(event.location)) {
    if (/zoom\.us|meet\.google|teams\.microsoft|webex/.test(event.location)) return event.location
  }
  const desc = event.description || ''
  const urlMatch = desc.match(/https?:\/\/[^\s"<>]+(?:zoom\.us|meet\.google|teams\.microsoft|webex)[^\s"<>]*/i)
  if (urlMatch) return urlMatch[0]
  return null
}
