'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserProfile,
  Session,
  getSessions,
  deleteSession,
} from '@/utils/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trackActivityPageView, trackSessionViewed } from '@/lib/gtag'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import GettingStartedChecklist from '@/components/GettingStartedChecklist'
import { getEventStartDate, getEventAttendees, getEventTitle } from '../calendar/event-utils'

export default function ActivityPage() {
  const router = useRouter();
  const { user: userInfo, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([])
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())

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
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

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
      setUpcomingMeeting(next?.event || null)
    } catch {}
  }, [userInfo])

  if (loading) {
    return null
  }

  if (!userInfo) {
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleDeleteClick = (sessionId: string) => {
    setConfirmDeleteId(sessionId);
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const sessionId = confirmDeleteId;
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(sessions => sessions.filter(s => s.id !== sessionId));
      toast.success('Activité supprimée');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const handleEmailClick = async (session: any) => {
    setEmailingId(session.id)
    const toastId = toast.loading("Génération du brouillon de l'email...")
    try {
      const response = await fetch('/api/activity/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: session.summary || session.transcription?.substring(0, 1000) || session.title,
          userName: userInfo?.display_name || userInfo?.email?.split('@')[0] || 'Utilisateur'
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la génération de l\'email')

      const { subject, body } = await response.json()

      // Open Gmail compose on the web (not the default mail app)
      const gmailUrl = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(gmailUrl, '_blank')

      toast.success("Brouillon ouvert dans Gmail", { id: toastId })
    } catch (e) {
      toast.error("Impossible de générer l'email", { id: toastId })
    } finally {
      setEmailingId(null)
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

  function extractCompanyFromDomain(domain: string): string | null {
    const personal = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','icloud.com','me.com','protonmail.com','proton.me','laposte.net','orange.fr','free.fr','sfr.fr','wanadoo.fr','hotmail.fr','yahoo.fr']
    if (personal.includes(domain)) return null
    const main = domain.split('.')[0]
    // Strip common corporate suffixes to get the brand name
    const name = main.replace(/(group|corp|inc|ltd|sa|sas|holding|digital|tech|services|solutions)$/i, '').trim()
    return name.length > 1 ? name.charAt(0).toUpperCase() + name.slice(1) : null
  }

  function buildMeetingContext(event: any): string | null {
    // 1. Use the event description if present (first sentence only)
    const rawDesc = (event.description || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (rawDesc.length > 10) {
      const sentence = rawDesc.split(/[.\n]/)[0].trim()
      if (sentence.length > 10) return sentence.length > 100 ? sentence.substring(0, 97) + '...' : sentence
    }

    // 2. Infer company from organizer email domain
    const org = event.organizer
    const orgEmail: string = typeof org === 'object' && org !== null ? (org.email || '') : (typeof org === 'string' ? org : '')
    const orgDomain = orgEmail.includes('@') ? orgEmail.split('@')[1].toLowerCase() : ''
    const company = orgDomain ? extractCompanyFromDomain(orgDomain) : null

    // 3. Fall back to attendee domains
    const attendeeEmails: string[] = Array.isArray(event.attendees)
      ? event.attendees.map((a: any) => (typeof a === 'object' ? a?.email : a) || '').filter(Boolean)
      : []
    const companyFromAttendee = !company
      ? attendeeEmails.map(e => extractCompanyFromDomain(e.split('@')[1]?.toLowerCase() || '')).find(Boolean) || null
      : null
    const brand = company || companyFromAttendee

    if (!brand) return null

    const title = (event.summary || '').toLowerCase()
    if (/entretien|interview/i.test(title)) return `Entretien avec ${brand}`
    if (/stage|internship/i.test(title)) return `Suivi de stage — ${brand}`
    if (/réunion|meeting|standup|stand-up/i.test(title)) return `Réunion avec ${brand}`
    return `Avec ${brand}`
  }

  return (
    <div className="min-h-screen bg-white text-[#282828] font-body selection:bg-primary/30">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-heading font-semibold text-black mb-2">
          {getGreeting()}, {userInfo.display_name}
        </h1>

        {(() => {
          if (!upcomingMeeting) return null
          const start = getEventStartDate(upcomingMeeting)
          if (!start || start <= currentTime) return null
          const isToday = start.toDateString() === currentTime.toDateString()
          const isTomorrow = new Date(currentTime.getTime() + 86_400_000).toDateString() === start.toDateString()
          const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : start.toLocaleDateString('fr-FR', { weekday: 'long' })
          const timeStr = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
          const context = buildMeetingContext(upcomingMeeting)
          return (
            <div className="mt-4 mb-6 border-l-[3px] border-blue-500 bg-blue-50/40 rounded-r-xl pl-4 pr-4 py-3">
              <p className="text-xs font-medium text-gray-400 mb-0.5">{dayLabel} à {timeStr}</p>
              <p className="text-[15px] font-semibold text-black">{getEventTitle(upcomingMeeting)}</p>
              {context && <p className="text-sm text-gray-500 mt-0.5">{context}</p>}
            </div>
          )
        })()}

        {!isLoading && (
          <GettingStartedChecklist
            allSessions={allSessions}
            userId={userInfo.uid || userInfo.email || 'anonymous'}
            userAliases={[userInfo.uid, userInfo.email].filter(Boolean)}
          />
        )}

        {sessions.length === 0 && !isLoading && (
          <div className="text-center mb-12">
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500 font-body">Chargement des conversations...</p>
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-10">
            {sortedDates.map((dateStr) => (
              <div key={dateStr} className="animate-fade-in">
                <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide font-sans">{dateStr}</h3>
                <div className="space-y-1">
                  {groupedSessions[dateStr].map((session) => {
                    const sessionDate = new Date(session.started_at);
                    const timeStr = sessionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

                    let durationStr = "0:00";
                    if (session.ended_at && session.started_at) {
                      const diffSec = Math.floor((session.ended_at - session.started_at) / 1000);
                      durationStr = formatDuration(Math.max(0, diffSec));
                    } else {
                      durationStr = "En cours";
                    }

                    let displayTitle = session.title;
                    if (!displayTitle || displayTitle.includes('Session @') || displayTitle === 'Session Sans Titre') {
                      displayTitle = 'Discussion avec Claire';
                    }
                    // Enforce max length: titles should be 3-6 words
                    if (displayTitle && displayTitle.length > 45) {
                      displayTitle = displayTitle.substring(0, 42).trimEnd() + '…';
                    }

                    return (
                      <div key={session.id} className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-white rounded-xl transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <Link
                            href={`/activity/details?sessionId=${session.id}`}
                            onClick={() => trackSessionViewed(session.id)}
                            className="text-[15px] font-medium text-black hover:text-primary transition-colors block truncate"
                          >
                            {displayTitle}
                          </Link>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md hidden sm:block">
                            {durationStr}
                          </div>
                          <div className="text-sm font-medium text-neutral-500 w-20 text-right">
                            {timeStr}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={(e) => { e.preventDefault(); handleDeleteClick(session.id); }}
                              disabled={deletingId === session.id}
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 transition-all"
                              title="Supprimer la session"
                            >
                              {deletingId === session.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-neutral-300 rounded-2xl bg-neutral-50/50">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4 px-4">
              Aucune conversation pour l'instant. Démarrez une conversation dans l'application de bureau pour voir votre activité ici.
            </p>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        title="Supprimer l'activité"
        message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible."
        confirmText="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
