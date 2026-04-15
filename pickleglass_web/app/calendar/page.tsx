'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Calendar,
  Mail,
  LogOut,
  RefreshCw,
  Video,
  ChevronRight,
} from 'lucide-react'
import { getApiHeaders } from '@/utils/api'
import { openOAuthPopup, checkAuthStatus, revokeAuth } from '@/utils/oauth'
import { toast } from 'react-hot-toast'
import {
  CalendarEvent,
  formatDateHeading,
  formatDurationLabel,
  formatTimeLabel,
  getEventAttendees,
  getEventJoinLink,
  getEventStartDate,
  getEventTitle,
} from './event-utils'

type CalendarGroup = {
  key: string
  label: string
  sortKey: number
  events: CalendarEvent[]
}

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: userInfo, loading: authLoading } = useAuth()

  const [isConfigured, setIsConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [operatingAuth, setOperatingAuth] = useState(false)
  const [preparingEmailId, setPreparingEmailId] = useState<string | null>(null)

  const authSuccess = searchParams.get('auth') === 'success'
  const toolName = 'google_calendar'
  const provider = 'google'

  const groupedEvents = useMemo<CalendarGroup[]>(() => {
    const groups = new Map<string, CalendarGroup>()

    upcomingEvents.forEach((event) => {
      const startDate = getEventStartDate(event)
      if (!startDate) return

      const dayKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(
        startDate.getDate()
      ).padStart(2, '0')}`
      const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()

      if (!groups.has(dayKey)) {
        groups.set(dayKey, {
          key: dayKey,
          label: formatDateHeading(startDate),
          sortKey: dayStart,
          events: [],
        })
      }

      groups.get(dayKey)!.events.push(event)
    })

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        events: group.events.sort((a, b) => {
          const aTime = getEventStartDate(a)?.getTime() || 0
          const bTime = getEventStartDate(b)?.getTime() || 0
          return aTime - bTime
        }),
      }))
      .sort((a, b) => b.sortKey - a.sortKey)
  }, [upcomingEvents])

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    const { auth } = await import('@/utils/firebase')
    return auth.currentUser?.uid || userInfo?.uid || null
  }, [userInfo?.uid])

  const fetchCalendarData = useCallback(
    async (userIdOverride?: string | null) => {
      const userId = userIdOverride || (await resolveUserId())
      if (!userId) return

      setEventsLoading(true)
      try {
        const eventsRes = await fetch(`/api/v1/tools/${toolName}/execute?userId=${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { ...(await getApiHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parameters: { operation: 'listEvents', maxResults: 50, userId },
          }),
        })

        if (!eventsRes.ok) {
          const errorBody = await eventsRes.text()
          console.error('[Calendar] execute returned', eventsRes.status, errorBody)
          toast.error('Impossible de charger les reunions')
          return
        }

        const eventsData = await eventsRes.json()
        const events = eventsData.result?.events || eventsData.events || []
        const normalized = Array.isArray(events) ? (events as CalendarEvent[]) : []

        setUpcomingEvents(normalized)

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('calendar:events', JSON.stringify(normalized))
        }
      } catch (error) {
        console.error('[Calendar] fetchCalendarData error:', error)
        toast.error('Impossible de charger les reunions')
      } finally {
        setEventsLoading(false)
      }
    },
    [resolveUserId, toolName]
  )

  const checkStatus = useCallback(async () => {
    setStatusLoading(true)
    const userId = await resolveUserId()

    try {
      if (!userId) return

      const status = await checkAuthStatus(toolName, userId)
      setIsConfigured(status.authenticated)
      setConnectedEmail((status as { accountEmail?: string }).accountEmail || null)

      if (status.authenticated) {
        await fetchCalendarData(userId)
      } else {
        setUpcomingEvents([])
      }
    } catch (error) {
      console.error('[Calendar] checkStatus failed', error)
    } finally {
      setStatusLoading(false)
    }
  }, [fetchCalendarData, resolveUserId, toolName])

  const waitForConnectedStatus = useCallback(
    async (userId: string) => {
      const maxAttempts = 12

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const status = await checkAuthStatus(toolName, userId)
          console.log('[Calendar] auth status poll', { attempt, status })

          setIsConfigured(status.authenticated)
          setConnectedEmail((status as { accountEmail?: string }).accountEmail || null)

          if (status.authenticated) {
            await fetchCalendarData(userId)
            return true
          }
        } catch (error) {
          console.error('[Calendar] auth status poll failed', { attempt, error })
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      return false
    },
    [fetchCalendarData, toolName]
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).api) return

    const api = (window as any).api
    const handleOAuthSuccess = async (_event: unknown, data: { tool?: string }) => {
      if (data.tool !== toolName) return
      const userId = await resolveUserId()
      if (!userId) return
      await waitForConnectedStatus(userId)
    }

    api.on('oauth:success', handleOAuthSuccess)
  }, [resolveUserId, toolName, waitForConnectedStatus])

  useEffect(() => {
    if (userInfo) {
      void checkStatus()
    }
  }, [userInfo, checkStatus])

  const handleConnect = async () => {
    try {
      setOperatingAuth(true)
      const userId = await resolveUserId()
      if (!userId) throw new Error('User not authenticated')

      await openOAuthPopup({ toolName, provider }, userId)

      const connected = await waitForConnectedStatus(userId)
      if (connected) {
        toast.success('Calendrier connecte')
        return
      }

      console.error('[Calendar] OAuth popup completed but credentials were not visible after polling')
      toast.error('Connexion Google effectuee, mais les reunions ne sont pas encore visibles')
    } catch (error: unknown) {
      console.error('[Calendar] handleConnect failed', error)
      if (error instanceof Error && error.message.includes('fermee')) return
      toast.error('Echec de la connexion au calendrier')
    } finally {
      setOperatingAuth(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setOperatingAuth(true)
      const userId = await resolveUserId()
      if (!userId) throw new Error('User not authenticated')

      await revokeAuth(toolName, userId)
      setIsConfigured(false)
      setConnectedEmail(null)
      setUpcomingEvents([])

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('calendar:events')
      }

      toast.success('Calendrier deconnecte')
    } catch (error) {
      console.error('[Calendar] handleDisconnect failed', error)
      toast.error('Echec de la deconnexion')
    } finally {
      setOperatingAuth(false)
    }
  }

  const handlePrepareEmail = async (event: CalendarEvent) => {
    setPreparingEmailId(event.id)
    const toastId = toast.loading("Generation du brouillon de l'email...")

    try {
      const attendees = getEventAttendees(event)
      const context = [
        `Reunion: ${getEventTitle(event)}`,
        `Description: ${event.description || 'Pas de description'}`,
        attendees.length > 0 ? `Participants: ${attendees.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      const response = await fetch('/api/activity/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          userName: userInfo?.display_name || userInfo?.email?.split('@')[0] || 'Utilisateur',
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la generation')

      const data = await response.json()
      const subject = encodeURIComponent(`Suivi de reunion: ${getEventTitle(event)}`)
      const body = encodeURIComponent(data.email || data.body || '')
      window.location.href = `mailto:?subject=${subject}&body=${body}`
      toast.success('Brouillon genere', { id: toastId })
    } catch (error) {
      console.error('[Calendar] handlePrepareEmail failed', error)
      toast.error("Echec de la generation de l'email", { id: toastId })
    } finally {
      setPreparingEmailId(null)
    }
  }

  const handleOpenEventDetails = (event: CalendarEvent) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`calendar:event:${event.id}`, JSON.stringify(event))
    }
    router.push(`/calendar/details?eventId=${encodeURIComponent(event.id)}`)
  }

  if (authSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-background">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Connexion reussie</h1>
        <p className="text-muted-foreground mb-8">
          Votre calendrier Google est connecte.
          <br />
          Cette fenetre peut etre fermee.
        </p>
        <Button onClick={() => window.close()} variant="outline">
          Fermer la fenetre
        </Button>
      </div>
    )
  }

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-white text-[#282828] font-body">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#282828] font-body selection:bg-primary/30">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-heading font-semibold text-black mb-2">Calendrier</h1>
        <p className="text-sm text-gray-500 mb-6">
          Les prochaines reunions sont synchronisees a partir de Google Calendar.
        </p>

        {!isConfigured ? (
          <div className="mt-2 text-left">
            <p className="text-sm text-gray-500 mb-6">Connectez votre compte Google pour synchroniser vos reunions.</p>
            <Button
              onClick={handleConnect}
              disabled={operatingAuth}
              variant="outline"
              className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm transition-all gap-2 px-4 h-9"
            >
              {operatingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
              )}
              <span className="text-sm">Connecter Google</span>
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-4 text-left mb-8">
            <div className="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">{connectedEmail || userInfo?.email || 'Connecte'}</span>
              <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>

            <div className="h-4 w-[1px] bg-gray-200" />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchCalendarData()}
                disabled={eventsLoading}
                className="text-gray-400 hover:text-gray-900 h-8 w-8 p-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={operatingAuth}
                className="text-gray-400 hover:text-red-500 h-8 px-2 transition-colors text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Deconnecter
              </Button>
            </div>
          </div>
        )}

        {isConfigured && (
          <div className="space-y-10">
            {eventsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des reunions...
              </div>
            ) : groupedEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Aucune reunion a venir.</p>
            ) : (
              groupedEvents.map((group) => (
                <div key={group.key} className="animate-fade-in">
                  <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide font-sans">{group.label}</h3>
                  <div className="space-y-1">
                    {group.events.map((event) => {
                      const start = getEventStartDate(event)
                      const joinLink = getEventJoinLink(event)

                      return (
                        <div
                          key={event.id}
                          className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-white rounded-xl transition-colors cursor-pointer"
                          onClick={() => handleOpenEventDetails(event)}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[15px] font-medium text-black transition-colors block truncate">{getEventTitle(event)}</p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md hidden sm:block">
                              {formatDurationLabel(event)}
                            </div>
                            <div className="text-sm font-medium text-neutral-500 w-20 text-right">{formatTimeLabel(start)}</div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {joinLink && (
                                <a
                                  href={joinLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex"
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-blue-500">
                                    <Video className="w-4 h-4" />
                                  </Button>
                                </a>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-400 hover:text-neutral-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handlePrepareEmail(event)
                                }}
                                disabled={preparingEmailId === event.id}
                              >
                                {preparingEmailId === event.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </Button>

                              <ChevronRight className="w-4 h-4 text-neutral-400" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

