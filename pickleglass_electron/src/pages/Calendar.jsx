import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../App.jsx'
import {
  fetchCalendarStatus,
  fetchCalendarEvents,
  connectCalendar,
  disconnectCalendar,
} from '../utils/api.js'
import {
  getEventStartDate,
  getEventTitle,
  getEventJoinLink,
  formatDateHeading,
  formatTimeLabel,
  formatDurationLabel,
} from '../utils/calendar.js'

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
)

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
)

const RefreshIcon = ({ spinning }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={spinning ? { animation: 'spin 1s linear infinite' } : {}}
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const LogOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export default function Calendar({ navigate }) {
  const { user } = useAuth()
  const [isConfigured, setIsConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState(null)
  const [events, setEvents] = useState([])
  const [operatingAuth, setOperatingAuth] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!user?.uid) return
    setStatusLoading(true)
    try {
      const status = await fetchCalendarStatus(user.uid)
      const authed = status?.authenticated || status?.isConnected || false
      setIsConfigured(authed)
      if (status?.accountEmail) setConnectedEmail(status.accountEmail)
      if (authed) {
        setEventsLoading(true)
        const evts = await fetchCalendarEvents(user.uid)
        setEvents(evts)
        setEventsLoading(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStatusLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleConnect = async () => {
    if (!user?.uid) return
    setOperatingAuth(true)
    try {
      await connectCalendar(user.uid)
    } catch (e) {
      console.error(e)
    } finally {
      setOperatingAuth(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user?.uid) return
    setOperatingAuth(true)
    try {
      await disconnectCalendar(user.uid)
      setIsConfigured(false)
      setConnectedEmail(null)
      setEvents([])
    } catch (e) {
      console.error(e)
    } finally {
      setOperatingAuth(false)
    }
  }

  const handleRefresh = async () => {
    if (!user?.uid) return
    setEventsLoading(true)
    try {
      const evts = await fetchCalendarEvents(user.uid)
      setEvents(evts)
    } catch (e) {
      console.error(e)
    } finally {
      setEventsLoading(false)
    }
  }

  const groupedEvents = useMemo(() => {
    const groups = new Map()
    events.forEach(event => {
      const start = getEventStartDate(event)
      if (!start) return
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
      if (!groups.has(key)) groups.set(key, { label: formatDateHeading(start), sortKey: dayStart, events: [] })
      groups.get(key).events.push(event)
    })

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        events: group.events.sort((a, b) => (getEventStartDate(a)?.getTime() || 0) - (getEventStartDate(b)?.getTime() || 0)),
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
  }, [events])

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-white">
      <div className="max-w-[760px] mx-auto px-5 py-8">
        <h1 className="text-[28px] font-semibold text-black mb-2 leading-tight">Calendrier</h1>
        <p className="text-[13px] text-gray-500 mb-5">Les prochaines reunions sont synchronisees a partir de Google Calendar.</p>

        {!isConfigured ? (
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-5">Connecte ton compte Google pour synchroniser tes reunions.</p>
            <button
              onClick={handleConnect}
              disabled={operatingAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {operatingAuth ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Connecter Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <span className="text-sm font-medium text-gray-700">{connectedEmail || 'Compte Google connecte'}</span>
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              </div>

              <div className="w-px h-4 bg-gray-200" />

              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  disabled={eventsLoading}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Actualiser"
                >
                  <RefreshIcon spinning={eventsLoading} />
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={operatingAuth}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <LogOutIcon />
                  Deconnecter
                </button>
              </div>
            </div>

            {eventsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                Chargement des reunions...
              </div>
            ) : groupedEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Aucune reunion a venir.</p>
            ) : (
              <div className="space-y-8">
                {groupedEvents.map(group => (
                  <div key={group.label}>
                    <h3 className="text-[12px] font-semibold text-gray-500 mb-3 tracking-wide">{group.label}</h3>
                    <div className="space-y-0.5">
                      {group.events.map(event => {
                        const start = getEventStartDate(event)
                        const joinLink = getEventJoinLink(event)
                        const duration = formatDurationLabel(event)
                        const timeStr = formatTimeLabel(start)

                        return (
                          <div
                            key={event.id}
                            className="group flex items-center justify-between py-2.5 px-3 -mx-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            onClick={() => navigate('calendar-details', { event })}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <span className="text-[14px] font-medium text-black block truncate">{getEventTitle(event)}</span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[12px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md hidden sm:block">{duration}</span>
                              <span className="text-[12px] font-medium text-neutral-500 w-14 text-right">{timeStr}</span>
                              {joinLink && (
                                <a
                                  href={joinLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                                  title="Rejoindre"
                                >
                                  <VideoIcon />
                                </a>
                              )}
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

        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    </div>
  )
}
