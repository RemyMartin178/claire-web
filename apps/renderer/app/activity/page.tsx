'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  Session,
  getSessions,
  deleteSession,
} from '@/utils/api'
import { Button } from '@/components/ui/button'
import { trackActivityPageView, trackSessionViewed } from '@/lib/gtag'
import { toast } from 'react-hot-toast'
import GettingStartedChecklist from '@/components/GettingStartedChecklist'
import { getEventStartDate, getEventEndDate, getEventTitle } from '../calendar/event-utils'

export default function ActivityPage() {
  const { user: userInfo, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([])
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [meetingBrief, setMeetingBrief] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [canStartClaire, setCanStartClaire] = useState(false)

  const fetchSessions = async () => {
    try {
      const fetchedSessions = await getSessions();
      setAllSessions(fetchedSessions);
      // Only show Listen (microphone) sessions — filter out Ask-only sessions
      const listenSessions = fetchedSessions.filter(s => s.session_type !== 'ask');
      setSessions(listenSessions);
      // GA4: track activity page view with session count
      trackActivityPageView(fetchedSessions.length)
    } catch (error) {
      console.error('Impossible de récupérer les conversations :', error)
    } finally {
      setIsLoading(false)
    }
  }

  const hasListenSession = allSessions.some((session) => session.session_type !== 'ask')

  useEffect(() => {
    if (userInfo) {
      fetchSessions()
    }
  }, [userInfo])

  useEffect(() => {
    if (!userInfo) return undefined

    const refreshSessions = () => {
      fetchSessions()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSessions()
      }
    }

    const handleSessionCreated = () => {
      refreshSessions()
    }

    window.addEventListener('focus', refreshSessions)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('claire:session-created', handleSessionCreated as EventListener)

    const interval = window.setInterval(() => {
      if (!document.hidden && !hasListenSession) {
        refreshSessions()
      }
    }, 10000)

    return () => {
      window.removeEventListener('focus', refreshSessions)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('claire:session-created', handleSessionCreated as EventListener)
      window.clearInterval(interval)
    }
  }, [userInfo, hasListenSession])

  // Clock tick to auto-hide past meetings
  useEffect(() => {
    setCurrentTime(new Date())
    setCanStartClaire(Boolean((window as any).api?.dashboard?.startClaire))
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Auto-trigger meeting notification window when meeting is within 5 minutes
  useEffect(() => {
    if (!upcomingMeeting || !currentTime) return
    const start = getEventStartDate(upcomingMeeting)
    if (!start) return
    const minutesUntil = (start.getTime() - currentTime.getTime()) / 60_000
    const api = (window as any).api?.dashboard
    if (!api) return
    if (minutesUntil > 0 && minutesUntil <= 5) {
      void api.showMeetingNotification?.({
        title: getEventTitle(upcomingMeeting),
        startTime: start.toISOString(),
        meetingUrl: (upcomingMeeting as any)?.hangoutLink || (upcomingMeeting as any)?.meetingUrl,
      })
    } else if (minutesUntil <= 0) {
      void api.hideMeetingNotification?.()
    }
  }, [upcomingMeeting, currentTime])

  // Load next upcoming meeting from sessionStorage (populated by the calendar page)
  useEffect(() => {
    if (!userInfo || typeof window === 'undefined') return
    try {
      const cached = window.sessionStorage.getItem('calendar:events')
      if (!cached) return
      const events = JSON.parse(cached) as any[]
      if (!Array.isArray(events)) return
      const now = new Date()
      const next = events
        .map((e) => ({ event: e, start: getEventStartDate(e) }))
        .filter(({ start }) => start && start > now)
        .sort((a, b) => a.start!.getTime() - b.start!.getTime())[0]
      const event = next?.event || null
      setUpcomingMeeting(event)

      if (event) {
        // Check sessionStorage cache first (written by calendar/details page)
        const cacheKey = `calendar:summary:${event.id}`
        const cached = window.sessionStorage.getItem(cacheKey)
        if (cached) {
          setMeetingBrief(cached)
        } else {
          // Generate via same API used by calendar details page
          const org = event.organizer
          const orgEmail: string = typeof org === 'object' && org !== null ? (org.email || '') : (typeof org === 'string' ? org : '')
          const attendeeEmails: string[] = Array.isArray(event.attendees)
            ? event.attendees.map((a: any) => (typeof a === 'object' ? a?.email : a) || '').filter(Boolean)
            : []

          fetch('/api/calendar/meeting-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: event.summary || '',
              organizerEmail: orgEmail,
              attendeeEmails,
              calendarDescription: event.description || '',
            }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.paragraph) {
                setMeetingBrief(data.paragraph)
                window.sessionStorage.setItem(cacheKey, data.paragraph)
              }
            })
            .catch(() => { })
        }
      }
    } catch { }
  }, [userInfo])

  if (loading) {
    return null
  }

  if (!userInfo) {
    return null
  }

  const getGreeting = (date: Date | null) => {
    if (!date) return 'Bienvenue';
    const hour = date.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bonne après-midi';
    return 'Bonsoir';
  };

  const handleDeleteClick = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(sessions => sessions.filter(s => s.id !== sessionId));
      toast.success('Activité supprimée');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
    } finally {
      setDeletingId(null);
    }
  }


  // Group sessions by date
  const groupedSessions: { [date: string]: Session[] } = {};
  sessions.forEach(session => {
    const dateObj = new Date(session.started_at);
    const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace('.', '');
    if (!groupedSessions[formattedDate]) {
      groupedSessions[formattedDate] = [];
    }
    groupedSessions[formattedDate].push(session);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
    // Small hack to parse the French dates back for sorting if needed, but since we pushed them from sorted timestamps initially,
    // it's safer to sort by picking the timestamp of the first item in the group.
    // # Decryption & Encryption Deactivation
    // - [x] Disable global encryption in `config-manager.js`
    // - [/] Fix race condition in `index.js` for migration startup
    // - [/] Improve `decrypt_firestore.js` to handle all possible fields and multiple users
    // - [x] Verify data is plaintext in Firestore after migration

    // # UI Improvements
    // - [x] Replace all browser-native `confirm()` and `alert()` pop-ups with custom modals (React & Electron)
    // - [x] Ensure notifications appear in the bottom-right via `react-hot-toast`

    // # Notification Standardization
    // - [ ] Remove custom notification system in `SettingsPage` and use `react-hot-toast`
    // - [ ] Remove custom notification system in `PasswordModal` and use `react-hot-toast`
    // - [ ] Audit and ensure global dark branding for all toasts in `RootLayout`
    return groupedSessions[b][0].started_at - groupedSessions[a][0].started_at;
  });

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }



  return (
    <div className="flex flex-col min-h-full text-foreground font-body">

      {/* ── Hero section ── */}
      <div className="shrink-0 border-b border-border/30 bg-muted/50 px-6 py-5">
        <div className="mx-auto w-full max-w-[52rem]">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Left: greeting */}
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-normal text-2xl text-muted-foreground/90 tracking-tight">
                {getGreeting(currentTime)}{userInfo.display_name ? `, ${userInfo.display_name.split(' ')[0]}` : ''}
              </h1>
            </div>

            {/* Right: Start Claire */}
            {canStartClaire && (
              <button
                onClick={() => (window as any).api.dashboard.startClaire()}
                aria-label="Démarrer Claire"
                className="relative inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-semibold text-white transform-gpu transition-all duration-200 hover:scale-[1.04] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                style={{ background: 'radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0%, #0c26a8 100%)', boxShadow: '0 0 0 0.678px #0c44a1, inset 0 -1.355px #022c70, inset 0 0.678px #81b6ff' }}
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="10 8 16 12 10 16 10 8" />
                </svg>
                Démarrer Claire
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List section ── */}
      <div className="flex-1 px-6 pb-6">
        <div className="mx-auto w-full max-w-[52rem]">

          {/* Upcoming meeting */}
          {(() => {
            if (!upcomingMeeting || !currentTime) return null
            const start = getEventStartDate(upcomingMeeting)
            if (!start || start <= currentTime) return null
            const end = getEventEndDate(upcomingMeeting)
            const isToday = start.toDateString() === currentTime.toDateString()
            const isTomorrow = new Date(currentTime.getTime() + 86_400_000).toDateString() === start.toDateString()
            const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : start.toLocaleDateString('fr-FR', { weekday: 'long' })
            const fmt = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
            const timeRange = end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
            return (
              <div className="mt-4 mb-2 border-l-[3px] border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 rounded-r-lg pl-4 pr-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{dayLabel} · {timeRange}</p>
                <p className="text-sm font-semibold text-foreground">{getEventTitle(upcomingMeeting)}</p>
                {meetingBrief && <p className="text-xs text-muted-foreground mt-0.5">{meetingBrief}</p>}
              </div>
            )
          })()}

          {/* Checklist */}
          {!isLoading && (
            <GettingStartedChecklist
              allSessions={allSessions}
              userId={userInfo.uid || userInfo.email || 'anonymous'}
              userAliases={[userInfo.uid, userInfo.email].filter(Boolean)}
            />
          )}

          {/* Sessions */}
          {isLoading ? (
            <div className="space-y-6 pt-6">
              {[0, 1].map(group => (
                <div key={group} className="animate-pulse">
                  <div className="h-3 w-20 bg-muted rounded mb-3" />
                  <div className="space-y-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                        <div className={`h-3.5 bg-muted rounded ${i === 0 ? 'w-[60%]' : i === 1 ? 'w-[45%]' : 'w-[52%]'}`} />
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="h-5 w-10 bg-muted rounded-full" />
                          <div className="h-3 w-10 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4 pt-6">
              {sortedDates.map((dateStr) => (
                <section key={dateStr}>
                  <h2 className="sticky top-0 z-10 mb-2 bg-background/80 py-2 font-semibold text-muted-foreground/70 text-xs backdrop-blur">
                    {dateStr}
                  </h2>
                  <ul className="space-y-1">
                    {groupedSessions[dateStr].map((session) => {
                      const sessionDate = new Date(session.started_at)
                      const timeStr = sessionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')

                      let durationStr = '0:00'
                      if (session.ended_at && session.started_at) {
                        const diffSec = Math.floor((session.ended_at - session.started_at) / 1000)
                        durationStr = formatDuration(Math.max(0, diffSec))
                      } else {
                        durationStr = 'En cours'
                      }

                      let displayTitle = session.title
                      if (!displayTitle || displayTitle.includes('Session @') || displayTitle === 'Session Sans Titre') {
                        displayTitle = 'Discussion avec Claire'
                      }
                      if (displayTitle && displayTitle.length > 45) {
                        displayTitle = displayTitle.substring(0, 42).trimEnd() + '…'
                      }

                      return (
                        <li key={session.id} className="group/row relative">
                          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors group-hover/row:bg-muted/70">
                            <Link
                              href={`/activity/details?sessionId=${session.id}`}
                              onClick={() => trackSessionViewed(session.id)}
                              className="truncate pr-3 font-medium text-sm text-foreground flex-1 block"
                            >
                              {displayTitle}
                            </Link>
                            <span className="flex shrink-0 items-center gap-3">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[11px] tabular-nums bg-muted text-foreground">
                                {durationStr}
                              </span>
                              <span className="text-[11px] text-muted-foreground w-[5ch] text-right">
                                {timeStr}
                              </span>
                              <Button
                                onClick={(e) => { e.preventDefault(); handleDeleteClick(session.id) }}
                                disabled={deletingId === session.id}
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 w-7 transition-all"
                              >
                                {deletingId === session.id ? (
                                  <div className="animate-spin h-3.5 w-3.5 border-2 border-red-500 rounded-full border-t-transparent" />
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </Button>
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="pt-16 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune session pour l'instant. Démarrez Claire pour voir votre activité ici.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
