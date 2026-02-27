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

export default function ActivityPage() {
  const router = useRouter();
  const { user: userInfo, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const fetchedSessions = await getSessions();
      setSessions(fetchedSessions);
      // GA4: track activity page view with session count
      trackActivityPageView(fetchedSessions.length)
    } catch (error) {
      console.error('Impossible de récupérer les conversations :', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userInfo) {
      fetchSessions()
    }
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
      console.error(error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#282828] font-body selection:bg-primary/30">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-heading font-semibold text-black mb-2">
          {getGreeting()}, {userInfo.display_name}
        </h1>

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
                    // If title looks like base64 or is clearly raw generic filler, try a fallback or clean it
                    if (!displayTitle || displayTitle.includes('Session @') || displayTitle === 'Session Sans Titre') {
                      displayTitle = 'Discussion avec Claire'; // Fallback to a cleaner title instead of raw timestamp
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
                          <Button
                            onClick={() => handleDeleteClick(session.id)}
                            disabled={deletingId === session.id}
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 transition-all"
                            title="Supprimer la session"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </Button>
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
