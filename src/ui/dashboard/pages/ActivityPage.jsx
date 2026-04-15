import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../DashboardApp.jsx'
import { getSessions, deleteSession } from '../ipcDb.js'
import { getEventStartDate, getEventEndDate, getEventTitle } from './calendarUtils.js'
import { RAILWAY_URL, getApiHeaders } from '../DashboardApp.jsx'

function formatDuration(startMs, endMs) {
  if (!endMs) return 'En cours'
  const sec = Math.floor((endMs - startMs) / 1000)
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function toMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts === 'number') return ts
  return 0
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

const SpinnerIcon = () => (
  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
)

export default function ActivityPage({ navigate }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [upcomingMeeting, setUpcomingMeeting] = useState(null)
  const [meetingBrief, setMeetingBrief] = useState(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await getSessions(user.uid)
      // Filter out ask-only sessions
      setSessions(data.filter(s => s.session_type !== 'ask'))
    } catch (e) { console.error('[ActivityPage]', e) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  // Clock tick — auto-hide past meetings
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Upcoming meeting from sessionStorage (populated by CalendarPage)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('calendar:events')
      if (!cached) return
      const events = JSON.parse(cached)
      const now = new Date()
      const next = events
        .map(e => ({ event: e, start: getEventStartDate(e) }))
        .filter(({ start }) => start && start > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0]
      const event = next?.event || null
      setUpcomingMeeting(event)
      if (event) {
        const cacheKey = `calendar:summary:${event.id}`
        const brief = sessionStorage.getItem(cacheKey)
        if (brief) { setMeetingBrief(brief); return }
        const org = event.organizer
        const orgEmail = typeof org === 'object' && org ? (org.email || '') : (typeof org === 'string' ? org : '')
        const attendeeEmails = Array.isArray(event.attendees)
          ? event.attendees.map(a => (typeof a === 'object' ? a?.email : a) || '').filter(Boolean) : []
        getApiHeaders().then(headers => {
          fetch(`${RAILWAY_URL}/api/calendar/meeting-summary`, {
            method: 'POST', headers,
            body: JSON.stringify({ title: event.summary || '', organizerEmail: orgEmail, attendeeEmails, calendarDescription: event.description || '' }),
          }).then(r => r.json()).then(d => {
            if (d.paragraph) { setMeetingBrief(d.paragraph); sessionStorage.setItem(cacheKey, d.paragraph) }
          }).catch(() => {})
        })
      }
    } catch {}
  }, [])

  const handleDelete = async () => {
    if (!confirmId) return
    setDeletingId(confirmId)
    setConfirmId(null)
    try {
      await deleteSession(user.uid, deletingId || confirmId)
      setSessions(prev => prev.filter(s => s.id !== (deletingId || confirmId)))
    } catch (e) { console.error('[ActivityPage] delete error', e) }
    finally { setDeletingId(null) }
  }

  // Group by date
  const groups = {}
  sessions.forEach(s => {
    const ms = toMs(s.startedAt || s.started_at)
    const d = new Date(ms)
    const key = d.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace('.', '')
    if (!groups[label]) groups[label] = []
    groups[label].push({ ...s, _ms: ms })
  })
  const sortedDates = Object.keys(groups).sort((a, b) => groups[b][0]._ms - groups[a][0]._ms)

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="min-h-screen bg-white text-[#282828]">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-semibold text-black mb-2">
          {getGreeting()}, {user.displayName?.split(' ')[0] || 'toi'}
        </h1>

        {/* Upcoming meeting card */}
        {upcomingMeeting && (() => {
          const start = getEventStartDate(upcomingMeeting)
          if (!start || start <= currentTime) return null
          const end = getEventEndDate(upcomingMeeting)
          const isToday = start.toDateString() === currentTime.toDateString()
          const isTomorrow = new Date(currentTime.getTime() + 86_400_000).toDateString() === start.toDateString()
          const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : start.toLocaleDateString('fr-FR', { weekday: 'long' })
          const fmt = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
          const timeRange = end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
          return (
            <div className="mt-4 mb-6 border-l-[3px] border-blue-500 bg-blue-50/40 rounded-r-xl pl-4 pr-4 py-3">
              <p className="text-xs font-medium text-gray-400 mb-0.5">{dayLabel} · {timeRange}</p>
              <p className="text-[15px] font-semibold text-black">{getEventTitle(upcomingMeeting)}</p>
              {meetingBrief && <p className="text-sm text-gray-500 mt-0.5">{meetingBrief}</p>}
            </div>
          )
        })()}

        {/* Sessions list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerIcon />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">Aucune conversation pour l'instant.</p>
        ) : (
          <div className="space-y-10 mt-8">
            {sortedDates.map(dateStr => (
              <div key={dateStr}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">{dateStr}</h3>
                <div className="space-y-0.5">
                  {groups[dateStr].map(session => {
                    const startMs = session._ms
                    const endMs = toMs(session.endedAt || session.ended_at)
                    const duration = formatDuration(startMs, endMs)
                    const timeStr = new Date(startMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
                    let title = session.title || 'Discussion avec Claire'
                    if (title.includes('Session @') || title === 'Session Sans Titre') title = 'Discussion avec Claire'
                    if (title.length > 45) title = title.substring(0, 42).trimEnd() + '…'

                    return (
                      <div
                        key={session.id}
                        className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                        onClick={() => navigate('activity-details', { sessionId: session.id })}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[15px] font-medium text-black hover:text-blue-600 transition-colors block truncate">
                            {title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                            {duration}
                          </span>
                          <span className="text-sm font-medium text-neutral-500 w-16 text-right">
                            {timeStr}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                            onClick={e => { e.stopPropagation(); setConfirmId(session.id) }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-semibold text-black mb-2">Supprimer cette activité ?</p>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg bg-neutral-100 text-[13px] font-medium text-gray-700 hover:bg-neutral-200 transition-colors"
                onClick={() => setConfirmId(null)}
              >Annuler</button>
              <button
                className="flex-1 py-2 rounded-lg bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                onClick={handleDelete}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
