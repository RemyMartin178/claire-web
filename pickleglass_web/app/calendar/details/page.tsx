'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Copy,
  Mail,
  Video,
  MapPin,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getApiHeaders } from '@/utils/api'
import {
  CalendarEvent,
  formatDurationLabel,
  formatEventDateLabel,
  formatEventRangeLabel,
  getEventAttendees,
  getEventJoinLink,
  getEventOrganizer,
  getEventTitle,
} from '../event-utils'

type DetailsTab = 'summary' | 'details'

function getInitials(label: string): string {
  if (label.includes('@')) {
    const local = label.split('@')[0]
    const parts = local.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return local.substring(0, 2).toUpperCase()
  }
  const words = label.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return label.substring(0, 2).toUpperCase()
}

function formatAttendeeLabel(label: string): { name: string; email: string | null } {
  if (!label.includes('@')) return { name: label, email: null }
  const local = label.split('@')[0]
  const name = local.split(/[._-]/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/\d+$/, '')).join(' ').trim() || label
  return { name, email: label }
}

function renderInlineBold(text: string) {
  const segments = text.split(/(\*\*.*?\*\*)/g)
  return segments.map((segment, index) =>
    segment.startsWith('**') && segment.endsWith('**') ? (
      <strong key={index} className="font-semibold text-[#1d1d1f]">
        {segment.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{segment}</span>
    )
  )
}

function renderSummary(summary: string) {
  const lines = summary.split('\n')
  const blocks: ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-5 space-y-3 mb-6 marker:text-[#86868b]">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`} className="text-[15px] leading-relaxed text-[#1d1d1f]">
            {renderInlineBold(item)}
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      return
    }

    if (trimmed.startsWith('## ')) {
      flushList()
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="text-[17px] font-semibold text-[#1d1d1f] mt-8 mb-4">
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      )
      return
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.replace(/^- /, ''))
      return
    }

    flushList()
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[15px] leading-relaxed text-[#1d1d1f] mb-4 whitespace-pre-wrap">
        {renderInlineBold(trimmed)}
      </p>
    )
  })

  flushList()
  return blocks
}

export default function CalendarDetailsPage() {
  const { user: userInfo, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')

  const [eventData, setEventData] = useState<CalendarEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailsTab>('summary')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    const { auth } = await import('@/utils/firebase')
    return auth.currentUser?.uid || userInfo?.uid || null
  }, [userInfo?.uid])

  const fetchEventFromApi = useCallback(
    async (targetEventId: string, userIdOverride?: string | null): Promise<CalendarEvent | null> => {
      const userId = userIdOverride || (await resolveUserId())
      if (!userId) return null

      const response = await fetch(`/api/v1/tools/google_calendar/execute?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { ...(await getApiHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters: { operation: 'listEvents', maxResults: 50, userId },
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[CalendarDetails] execute returned', response.status, errorBody)
        return null
      }

      const payload = await response.json()
      const events = payload.result?.events || payload.events || []
      if (!Array.isArray(events)) return null

      const match = (events as CalendarEvent[]).find((event) => event.id === targetEventId) || null

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('calendar:events', JSON.stringify(events))
        if (match) {
          window.sessionStorage.setItem(`calendar:event:${targetEventId}`, JSON.stringify(match))
        }
      }

      return match
    },
    [resolveUserId]
  )

  const loadEvent = useCallback(
    async (targetEventId: string) => {
      const fromSession =
        typeof window !== 'undefined' ? window.sessionStorage.getItem(`calendar:event:${targetEventId}`) : null
      if (fromSession) {
        try {
          const parsed = JSON.parse(fromSession) as CalendarEvent
          if (parsed?.id === targetEventId) {
            setEventData(parsed)
            setIsLoading(false)
            return
          }
        } catch {
          // Ignore corrupted session cache.
        }
      }

      const fromList = typeof window !== 'undefined' ? window.sessionStorage.getItem('calendar:events') : null
      if (fromList) {
        try {
          const list = JSON.parse(fromList) as CalendarEvent[]
          const match = Array.isArray(list) ? list.find((event) => event.id === targetEventId) : null
          if (match) {
            setEventData(match)
            setIsLoading(false)
            return
          }
        } catch {
          // Ignore corrupted list cache.
        }
      }

      const fetched = await fetchEventFromApi(targetEventId)
      setEventData(fetched)
      setIsLoading(false)
    },
    [fetchEventFromApi]
  )

  useEffect(() => {
    if (!eventId || authLoading) return
    void loadEvent(eventId)
  }, [authLoading, eventId, loadEvent])

  useEffect(() => {
    if (!eventData) return
    setAiSummary(null)
    setIsSummaryLoading(true)

    const org = eventData.organizer
    const orgEmail: string = typeof org === 'object' && org !== null
      ? ((org as { email?: string }).email || '')
      : (typeof org === 'string' ? org : '')
    const attendeeEmails: string[] = Array.isArray(eventData.attendees)
      ? eventData.attendees.map((a: unknown) => {
          if (typeof a === 'object' && a !== null) return (a as { email?: string }).email || ''
          return typeof a === 'string' ? a : ''
        }).filter(Boolean)
      : []

    fetch('/api/calendar/meeting-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: getEventTitle(eventData),
        organizerEmail: orgEmail,
        attendeeEmails,
        calendarDescription: eventData.description || '',
        dateLabel: formatEventDateLabel(eventData),
        rangeLabel: formatEventRangeLabel(eventData),
        duration: formatDurationLabel(eventData),
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.paragraph) setAiSummary(data.paragraph) })
      .catch(() => {})
      .finally(() => setIsSummaryLoading(false))
  }, [eventData])

  const handleRefresh = async () => {
    if (!eventId) return
    setIsRefreshing(true)
    const refreshed = await fetchEventFromApi(eventId)
    setEventData(refreshed)
    setIsRefreshing(false)
    if (refreshed) {
      toast.success('Reunion actualisee')
    } else {
      toast.error('Impossible de recharger la reunion')
    }
  }

  const handleCopySummary = async () => {
    if (!eventData) return
    await navigator.clipboard.writeText(aiSummary || getEventTitle(eventData))
    toast.success('Resume copie')
  }

  const handlePrepareEmail = async () => {
    if (!eventData) return

    setIsEmailing(true)
    const toastId = toast.loading("Generation du brouillon de l'email...")

    try {
      const attendees = getEventAttendees(eventData)
      const context = [
        `Reunion: ${getEventTitle(eventData)}`,
        `Description: ${eventData.description || 'Pas de description'}`,
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

      const subject = encodeURIComponent(`Suivi de reunion: ${getEventTitle(eventData)}`)
      const body = encodeURIComponent(data.email || data.body || '')
      window.location.href = `mailto:?subject=${subject}&body=${body}`
      toast.success('Brouillon genere', { id: toastId })
    } catch (error) {
      console.error('[CalendarDetails] email generation failed', error)
      toast.error("Echec de la generation de l'email", { id: toastId })
    } finally {
      setIsEmailing(false)
    }
  }

  const attendees = useMemo(() => (eventData ? getEventAttendees(eventData) : []), [eventData])
  const joinLink = useMemo(() => (eventData ? getEventJoinLink(eventData) : null), [eventData])
  const organizer = useMemo(() => (eventData ? getEventOrganizer(eventData) : null), [eventData])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!eventId || !eventData) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f] flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-semibold mb-4">Reunion introuvable</h2>
        <p className="text-[#86868b] mb-8 text-center">
          Impossible de charger cette reunion. Retournez au calendrier puis reouvrez la reunion.
        </p>
        <Link href="/calendar">
          <Button className="bg-[#1d1d1f] text-white hover:bg-black">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au calendrier
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans">
      <div className="max-w-5xl mx-auto px-8 pt-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/calendar" className="inline-flex items-center text-[#94a3b8] hover:text-[#1d1d1f] transition-all group">
            <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
            <span className="text-[14px] font-medium">Retour</span>
          </Link>

          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="text-[#86868b]">
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl mb-4 font-semibold tracking-tight text-[#1d1d1f]">{getEventTitle(eventData)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-[#007aff]" />
              <span className="text-[13px] font-medium text-[#1d1d1f]">Reunion</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1d1d1f]/50" />
              <span className="text-[13px] font-medium text-[#1d1d1f]">{formatEventDateLabel(eventData)}</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-[#1d1d1f]/50" />
              <span className="text-[13px] font-medium text-[#1d1d1f]">
                {formatEventRangeLabel(eventData)} ({formatDurationLabel(eventData)})
              </span>
            </div>

            {joinLink && (
              <a href={joinLink} target="_blank" rel="noopener noreferrer" className="ml-auto">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Rejoindre
                </Button>
              </a>
            )}

            <Button
              type="button"
              onClick={handlePrepareEmail}
              disabled={isEmailing}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              {isEmailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Mail de suivi
            </Button>
          </div>
        </div>

        <div className="mb-6 mt-2">
          <div className="inline-flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
            {(['summary', 'details'] as DetailsTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-[12px] transition-all rounded-md whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-[#1d1d1f] font-semibold bg-white shadow-sm border border-gray-200/50'
                    : 'text-[#8e8e93] hover:text-[#1d1d1f] font-medium'
                }`}
              >
                {tab === 'summary' ? 'Resume' : 'Details'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'summary' ? (
          <div className="space-y-8">
            {/* AI-generated paragraph */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Resume</h2>
                {aiSummary && (
                  <button
                    onClick={() => void handleCopySummary()}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copier
                  </button>
                )}
              </div>
              {isSummaryLoading ? (
                <div className="space-y-2.5">
                  <div className="h-4 bg-gray-100 rounded-md animate-pulse w-full" />
                  <div className="h-4 bg-gray-100 rounded-md animate-pulse w-5/6" />
                  <div className="h-4 bg-gray-100 rounded-md animate-pulse w-4/6" />
                </div>
              ) : aiSummary ? (
                <p className="text-[15px] leading-[1.7] text-[#1d1d1f]">{aiSummary}</p>
              ) : (
                <p className="text-[15px] text-[#86868b] italic">Aucune description disponible.</p>
              )}
            </div>

            {/* People in this call */}
            {attendees.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-4">
                  Participants
                </h3>
                <div className="space-y-3">
                  {attendees.map((attendee) => {
                    const initials = getInitials(attendee)
                    const { name, email } = formatAttendeeLabel(attendee)
                    return (
                      <div key={attendee} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-semibold text-gray-500 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{name}</p>
                          {email && <p className="text-[12px] text-[#86868b] truncate">{email}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 p-5 bg-white space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                <Calendar className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{formatEventDateLabel(eventData)}</span>
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                <Clock className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{formatEventRangeLabel(eventData)} ({formatDurationLabel(eventData)})</span>
              </div>
              {organizer && (
                <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                  <Users className="w-4 h-4 text-[#86868b] shrink-0" />
                  <span>Organisateur : {organizer}</span>
                </div>
              )}
              {eventData.location && (
                <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                  <MapPin className="w-4 h-4 text-[#86868b] shrink-0" />
                  <span>{eventData.location}</span>
                </div>
              )}
            </div>

            {(joinLink || eventData.htmlLink) && (
              <div className="rounded-2xl border border-gray-100 p-5 bg-white space-y-3">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">Liens</h3>
                {joinLink && (
                  <a href={joinLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] text-[#1d1d1f] hover:text-[#007aff] transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Rejoindre la reunion
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {eventData.htmlLink && (
                  <a href={eventData.htmlLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] text-[#1d1d1f] hover:text-[#007aff] transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Ouvrir dans Google Calendar
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
