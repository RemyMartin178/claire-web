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
// SUPPRIMER : import { useTranslation } from 'react-i18next';

export default function ActivityPage() {
  const router = useRouter();
  const { user: userInfo, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const fetchedSessions = await getSessions();
      setSessions(fetchedSessions);
    } catch (error) {
      console.error('Impossible de récupérer les conversations :', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && !userInfo) {
      router.push('/login');
      return;
    }
    if (userInfo) {
      fetchSessions()
    }
  }, [userInfo, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return null; // Will redirect to login
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible.')) return;
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(sessions => sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      alert('Échec de la suppression de l’activité.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#202123' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl text-white">
            {getGreeting()}, {userInfo.displayName}
          </h1>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white mb-8 text-center">
            Votre activité passée
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des conversations...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="block bg-card-bg rounded-lg p-6 shadow-sm border border-sidebar-border hover:shadow-md transition-shadow cursor-pointer text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link href={`/activity/details?sessionId=${session.id}`} className="text-lg font-medium text-white hover:underline">
                        {session.title || `Conversation - ${new Date(session.started_at * 1000).toLocaleDateString()}`}
                      </Link>
                      <div className="text-sm text-[#9ca3af]">
                        {new Date(session.started_at * 1000).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className={`ml-4 px-3 py-1 rounded text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors ${deletingId === session.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {deletingId === session.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <span className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.session_type === 'listen' ? 'bg-accent-light text-white' : 'bg-accent-light text-white'}`}>
                    {session.session_type || 'ask'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center bg-card-bg rounded-lg p-12 text-white">
              <p className="text-white mb-4">
                Aucune conversation pour l’instant. Démarrez une conversation dans l’application de bureau pour voir votre activité ici.
              </p>
              <div className="text-sm text-white">
                💡 Astuce : Utilisez l’application de bureau pour avoir des conversations IA qui apparaîtront ici automatiquement.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 