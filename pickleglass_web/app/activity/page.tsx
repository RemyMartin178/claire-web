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
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--main-surface-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 
            className="text-3xl font-semibold tracking-tight mb-2" 
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {getGreeting()}, {userInfo.display_name}
          </h1>
        </div>
        <div>
          <h2 
            className="text-2xl font-medium mb-8 text-center tracking-tight" 
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            Votre activité passée
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--text-secondary)' }}></div>
              <p className="mt-4" style={{ color: 'var(--text-primary)' }}>Chargement des conversations...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-6">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="block rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer" 
                  style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--card-border)', 
                    color: 'var(--text-primary)' 
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Link 
                        href={`/activity/details?sessionId=${session.id}`} 
                        className="text-lg font-medium hover:underline transition-colors duration-200" 
                        style={{ 
                          color: 'var(--text-primary)',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                      >
                        {session.title || `Conversation - ${new Date(session.started_at * 1000).toLocaleDateString()}`}
                      </Link>
                      <div 
                        className="text-sm mt-1" 
                        style={{ 
                          color: 'var(--text-secondary)',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                      >
                        {new Date(session.started_at * 1000).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className={`ml-4 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${deletingId === session.id ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                      style={{ 
                        borderColor: 'rgba(239, 68, 68, 0.2)', 
                        color: '#f87171', 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      {deletingId === session.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                  <span 
                    className="capitalize inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium" 
                    style={{ 
                      backgroundColor: session.session_type === 'ask' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
                      color: session.session_type === 'ask' ? '#93c5fd' : '#86efac',
                      border: `1px solid ${session.session_type === 'ask' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    {session.session_type === 'ask' ? 'Demander' : session.session_type || 'Demander'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="text-center rounded-lg p-12" 
              style={{ 
                backgroundColor: 'var(--card-bg)', 
                color: 'var(--text-primary)' 
              }}
            >
              <p className="mb-4" style={{ color: 'var(--text-primary)' }}>
                Aucune conversation pour l&#39;instant. Démarrez une conversation dans l&#39;application de bureau pour voir votre activité ici.
              </p>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                💡 Astuce : Utilisez l&#39;application de bureau pour avoir des conversations IA qui apparaîtront ici automatiquement.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
