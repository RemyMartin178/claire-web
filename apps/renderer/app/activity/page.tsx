'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Session, deleteSession } from '@/utils/api'
import { Button } from '@/components/ui/button'
import { trackActivityPageView, trackSessionViewed } from '@/lib/gtag'
import { toast } from 'react-hot-toast'
import { getEventStartDate, getEventEndDate, getEventTitle } from '../calendar/event-utils'
import { ActivitySessionListSkeleton } from '@/components/ActivityListSkeleton'
import {
  patchSessionList,
  prefetchSessionDetailsQuery,
  sessionKeys,
  useSessionsQuery,
} from '@/hooks/useSessionQueries'
import { useSharedState } from '@/contexts/SharedStateContext'
import {
  getSessionPhase,
  getSessionDisplayTitle,
  getSessionBadgeLabel,
} from '@/utils/sessionDisplay'

export default function ActivityPage() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter()
  const queryClient = useQueryClient()
  const { state: sharedState, ready: sharedReady } = useSharedState()
  const sessionsQuery = useSessionsQuery(Boolean(userInfo))
  const allSessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data])
  const sessions = useMemo(() => allSessions.filter(s => s.session_type !== 'ask'), [allSessions])
  const isLoading = sessionsQuery.isLoading && !sessionsQuery.data
  const isRefreshing = sessionsQuery.isFetching && !isLoading
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hasRenderedActivity, setHasRenderedActivity] = useState(false)

  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([])
  const [meetingBrief, setMeetingBrief] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [canStartClaire, setCanStartClaire] = useState(false)
  const [isStartingClaire, setIsStartingClaire] = useState(false)
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null)

  const hasListenSession = allSessions.some((session) => session.session_type !== 'ask')
  const focusCount = sharedState?.dashboardFocusCount ?? 0
  const prevFocusCount = useRef<number | null>(null)

  // Auto-navigate to the active session on explicit dashboard focus.
  // No sessionStorage lock — it was preventing legitimate re-opens after the user
  // came back to the activity list and re-focused the dashboard.
  useEffect(() => {
    if (!sharedReady) return
    const sessionId = sharedState?.session?.id
    if (!sessionId) return
    const isFirst = prevFocusCount.current === null
    const didFocus = !isFirst && focusCount > (prevFocusCount.current ?? 0)
    prevFocusCount.current = focusCount
    if (!didFocus) return
    router.push(`/activity/details?sessionId=${sessionId}&title=Session+en+cours&new=1`)
  }, [sharedReady, focusCount, sharedState?.session?.id, router])

  useEffect(() => {
    if (!sharedState?.lastSessionId) return
    void queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
  }, [sharedState?.lastSessionId, queryClient])

  useEffect(() => {
    if (sessionsQuery.error) {
      console.error('Impossible de récupérer les conversations :', sessionsQuery.error)
    }
  }, [sessionsQuery.error])

  useEffect(() => {
    if (sessionsQuery.data) {
      trackActivityPageView(sessionsQuery.data.length)
      setHasRenderedActivity(true)
    }
  }, [sessionsQuery.data])

  useEffect(() => {
    if (isLoading || sessions.length === 0) return undefined

    const warmRecentSessions = () => {
      sessions.slice(0, 3).forEach((session) => {
        void prefetchSessionDetailsQuery(queryClient, session.id)
      })
    }

    const requestIdleCallback = (window as any).requestIdleCallback
    const cancelIdleCallback = (window as any).cancelIdleCallback

    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(warmRecentSessions, { timeout: 1500 })
      return () => {
        if (typeof cancelIdleCallback === 'function') {
          cancelIdleCallback(idleId)
        }
      }
    }

    const timeoutId = window.setTimeout(warmRecentSessions, 600)
    return () => window.clearTimeout(timeoutId)
  }, [isLoading, queryClient, sessions])

  useEffect(() => {
    if (!userInfo) return undefined

    const handleSessionCreated = () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
    }

    window.addEventListener('claire:session-created', handleSessionCreated as EventListener)

    return () => {
      window.removeEventListener('claire:session-created', handleSessionCreated as EventListener)
    }
  }, [userInfo, queryClient])

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
      const sorted = events
        .map((e) => ({ event: e, start: getEventStartDate(e) }))
        .filter(({ start }) => start && start > now)
        .sort((a, b) => a.start!.getTime() - b.start!.getTime())
      const next = sorted[0]
      const event = next?.event || null
      setUpcomingMeeting(event)
      setUpcomingMeetings(sorted.slice(0, 4).map(x => x.event))

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
      patchSessionList(queryClient, (sessions) => sessions.filter(s => s.id !== sessionId));
      queryClient.removeQueries({ queryKey: sessionKeys.detail(sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      toast.success('Activité supprimée');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
    } finally {
      setDeletingId(null);
    }
  }

  const warmSessionDetails = (sessionId: string) => {
    void prefetchSessionDetailsQuery(queryClient, sessionId)
  }

  const getSessionDetailsHref = (session: Session, title: string) => {
    const params = new URLSearchParams({
      sessionId: session.id,
      title,
      createdAt: new Date(session.started_at).toISOString(),
    })

    return `/activity/details?${params.toString()}`
  }

  const warmSessionNavigation = (session: Session, title: string) => {
    warmSessionDetails(session.id)
    router.prefetch(getSessionDetailsHref(session, title))
  }

  const openSession = (session: Session, title: string) => {
    if (openingSessionId) return
    const href = getSessionDetailsHref(session, title)
    setOpeningSessionId(session.id)
    warmSessionNavigation(session, title)
    trackSessionViewed(session.id)
    router.push(href)
  }

  const handleStartClaire = async () => {
    if (isStartingClaire) return
    setIsStartingClaire(true)

    try {
      const result = await (window as any).api?.dashboard?.startClaire?.()
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to start Claire')
      }
    } catch {
      setIsStartingClaire(false)
      toast.error("Impossible de démarrer Claire.")
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

  // Sort sessions within each day descending
  Object.keys(groupedSessions).forEach(key => {
    groupedSessions[key].sort((a, b) => b.started_at - a.started_at);
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
    <div className="flex flex-col min-h-full text-foreground font-body motion-safe:animate-page-enter">

      {/* ── Hero section — exact Cluely structure ── */}
      <div className="shrink-0 border-b border-border/30 bg-muted/50 px-6 py-5">
        <div className="mx-auto w-full max-w-[52rem]">

          {/* Row 1: title + button */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <h1 className="mr-2 font-normal text-2xl text-muted-foreground/90 tracking-tight">
                {getGreeting(currentTime)}{userInfo.display_name ? `, ${userInfo.display_name.split(' ')[0]}` : ''}
              </h1>
              {isRefreshing && (
                <span className="size-3 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60 animate-spin" />
              )}
            </div>

            {canStartClaire && (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-3">
                  {isStartingClaire && (
                    <span aria-label="Demarrage en cours" className="size-4 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/70 animate-spin" />
                  )}
                  {/* Cluely-style premium Start button: taller, radial+linear gradient stack, inset highlights */}
                  <button
                    onClick={handleStartClaire}
                    disabled={isStartingClaire}
                    aria-label="Démarrer Claire"
                    className="group relative inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold text-white transition-[transform,filter,box-shadow] duration-200 ease-out hover:scale-[1.04] hover:brightness-105 active:scale-[0.97] disabled:opacity-70 disabled:hover:scale-100 focus-visible:outline-none"
                    style={{
                      background:
                        'radial-gradient(120% 130% at 50% -10%, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 35%, transparent 70%), radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0%, #0c26a8 100%)',
                      boxShadow:
                        '0 18px 38px rgba(8, 30, 105, 0.45), 0 6px 14px rgba(0,0,0,0.25), 0 0 0 0.678px #0c44a1, inset 0 -1.355px #022c70, inset 0 0.678px #81b6ff',
                    }}
                  >
                    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="10 8 16 12 10 16 10 8" />
                    </svg>
                    Démarrer Claire
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground/60 tabular-nums pr-1">
                  {sessions.length} {sessions.length === 1 ? 'session enregistrée' : 'sessions enregistrées'}
                </span>
              </div>
            )}
          </div>

          {/* Row 2: calendar link / upcoming meetings — inside header like Cluely */}
          {currentTime && upcomingMeetings.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {upcomingMeetings.map((meeting, idx) => {
                const start = getEventStartDate(meeting)
                if (!start || start <= currentTime) return null
                const end = getEventEndDate(meeting)
                const isToday = start.toDateString() === currentTime.toDateString()
                const isTomorrow = new Date(currentTime.getTime() + 86_400_000).toDateString() === start.toDateString()
                const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                const fmt = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
                const minutesUntil = Math.round((start.getTime() - currentTime.getTime()) / 60_000)
                const title = getEventTitle(meeting)
                const brief = idx === 0 ? meetingBrief : null
                return (
                  <li key={meeting.id || idx} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors duration-150 cursor-default">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                      <svg className="size-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm text-foreground">{title}</span>
                        {minutesUntil <= 15 && minutesUntil > 0 && (
                          <span className="shrink-0 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500">Dans {minutesUntil} min</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">{dayLabel} · {fmt(start)}{end ? ` – ${fmt(end)}` : ''}</p>
                      {brief && <p className="mt-0.5 text-xs text-muted-foreground/80 line-clamp-2">{brief}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground/80">
              <button className="text-blue-500 hover:underline font-medium" onClick={() => {}}>Relier votre calendrier</button>
              {' '}pour recevoir des notifications pour vos réunions à venir.
            </p>
          )}
        </div>
      </div>

      {/* ── Sessions list ── */}
      <div className="flex-1 px-6 pb-6">
        <div className="mx-auto w-full max-w-[52rem]">

          {/* Sessions */}
          {isLoading && !hasRenderedActivity ? (
            <ActivitySessionListSkeleton />
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

                      // Phase is the single source of truth (ongoing/analyzing/completed).
                      // No more page-level "Discussion avec Claire" fallback.
                      const phase = getSessionPhase(session, null)
                      const isLive = phase === 'ongoing'
                      const isAnalyzing = phase === 'analyzing'
                      let displayTitle = getSessionDisplayTitle(session, null)
                      if (displayTitle.length > 45) {
                        displayTitle = displayTitle.substring(0, 42).trimEnd() + '…'
                      }
                      const badgeLabel = getSessionBadgeLabel(phase, durationStr)

                      return (
                        <li key={session.id} className="group/row relative">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              if ((event.target as HTMLElement).closest('[data-row-action]')) return
                              openSession(session, displayTitle)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openSession(session, displayTitle)
                              }
                            }}
                            onPointerDown={() => warmSessionNavigation(session, displayTitle)}
                            className="flex cursor-default items-center justify-between rounded-lg px-3 py-2.5 transform-gpu transition-[background-color,filter,opacity] duration-180 ease-apple group-hover/row:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                          >
                            <span
                              className={[
                                'truncate pr-3 font-medium text-sm flex-1 block',
                                isLive || isAnalyzing ? 'cluely-text-shimmer' : 'text-foreground',
                              ].join(' ')}
                            >
                              {displayTitle}
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                              <span
                                className={[
                                  'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[11px] tabular-nums',
                                  isLive
                                    ? 'bg-muted text-muted-foreground animate-pulse'
                                    : isAnalyzing
                                      ? 'bg-muted cluely-text-shimmer'
                                      : 'bg-muted text-muted-foreground',
                                ].join(' ')}
                              >
                                {badgeLabel}
                              </span>
                              <span className="text-[11px] text-muted-foreground tabular-nums lowercase transition-all duration-200 group-hover/row:-translate-x-1.5 group-hover/row:opacity-0">
                                {timeStr}
                              </span>
                              <Button
                                data-row-action
                                onClick={(e) => { e.preventDefault(); handleDeleteClick(session.id) }}
                                disabled={deletingId === session.id}
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 opacity-0 translate-x-1 group-hover/row:translate-x-0 group-hover/row:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 w-7 transition-[background-color,color,opacity,transform] duration-180 ease-apple"
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
