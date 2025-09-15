'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserProfile,
  SessionDetails,
  Transcript,
  AiMessage,
  getSessionDetails,
  deleteSession,
} from '@/utils/api'

type ConversationItem = (Transcript & { type: 'transcript' }) | (AiMessage & { type: 'ai_message' });

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-8">
        <h2 
            className="text-lg font-semibold mb-4 tracking-tight" 
            style={{ 
                color: 'var(--text-primary)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
        >
            {title}
        </h2>
        <div 
            className="space-y-3" 
            style={{ 
                color: 'var(--text-secondary)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
        >
            {children}
        </div>
    </div>
);

function SessionDetailsContent() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userInfo) {
      router.push('/login');
    }
  }, [userInfo, loading, router]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userInfo && sessionId) {
      const fetchDetails = async () => {
        setIsLoading(true);
        try {
          const details = await getSessionDetails(sessionId as string);
          setSessionDetails(details);
        } catch (error) {
          console.error('Failed to load session details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [userInfo, sessionId]);

  const handleDelete = async () => {
    if (!sessionId) return;
    if (!window.confirm('Are you sure you want to delete this activity? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteSession(sessionId);
      router.push('/activity');
    } catch (error) {
      alert('Failed to delete activity.');
      setDeleting(false);
      console.error(error);
    }
  };

  if (loading || isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative" 
        style={{ 
          background: 'var(--main-surface-primary)', 
          color: 'var(--text-primary)',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--text-secondary)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Chargement des détails de la session...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  if (!sessionDetails) {
    return (
        <div 
          className="min-h-screen flex items-center justify-center relative" 
          style={{ 
            background: 'var(--main-surface-primary)', 
            color: 'var(--text-primary)',
          }}
        >
            <div className="max-w-4xl mx-auto px-8 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 
                  className="text-2xl font-semibold mb-4 tracking-tight" 
                  style={{ 
                    color: 'var(--text-primary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  Session introuvable
                </h2>
                <p 
                  className="mb-6" 
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  La session demandée n&#39;a pas pu être trouvée.
                </p>
                <Link 
                  href="/activity" 
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
                  style={{ 
                    color: '#93c5fd',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour à l&#39;activité
                </Link>
            </div>
        </div>
    )
  }
  
  const askMessages = sessionDetails.ai_messages || [];

  return (
    <div 
      className="min-h-screen animate-fade-in relative" 
      style={{ 
        background: 'var(--main-surface-primary)', 
        color: 'var(--text-primary)',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.02) 0%, transparent 70%)'
      }}
    >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <Link 
                  href="/activity" 
                  className="inline-flex items-center text-sm transition-colors duration-200 hover:scale-105"
                  style={{ 
                    color: 'var(--text-secondary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                </Link>
            </div>

            <div 
              className="p-8 rounded-2xl backdrop-blur-md border border-white/10 transition-all duration-300 ease-out hover:scale-[1.01]" 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                color: 'var(--text-primary)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
              }}
            >
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                        <h1 
                          className="text-2xl font-semibold mb-3 tracking-tight" 
                          style={{ 
                            color: 'var(--text-primary)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}
                        >
                            {sessionDetails.session.title || `Conversation du ${new Date(sessionDetails.session.started_at * 1000).toLocaleDateString()}`}
                        </h1>
                        <div className="flex items-center text-sm space-x-4">
                            <span 
                              style={{ 
                                color: 'var(--text-secondary)',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                              }}
                            >
                              {new Date(sessionDetails.session.started_at * 1000).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span 
                              style={{ 
                                color: 'var(--text-secondary)',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                              }}
                            >
                              {new Date(sessionDetails.session.started_at * 1000).toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                            </span>
                            <span 
                              className="capitalize px-3 py-1.5 rounded-full text-xs font-medium" 
                              style={{ 
                                backgroundColor: sessionDetails.session.session_type === 'ask' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
                                color: sessionDetails.session.session_type === 'ask' ? '#93c5fd' : '#86efac',
                                border: `1px solid ${sessionDetails.session.session_type === 'ask' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                              }}
                            >
                                {sessionDetails.session.session_type === 'ask' ? 'Demander' : 'Écouter'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${deleting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                        style={{ 
                          borderColor: 'rgba(239, 68, 68, 0.2)', 
                          color: '#f87171', 
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        {deleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>

                {sessionDetails.summary && (
                    <Section title="Résumé">
                        <div 
                          className="text-lg italic mb-6 p-4 rounded-xl backdrop-blur-md border border-white/10" 
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-primary)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}
                        >
                          &quot;{sessionDetails.summary.tldr}&quot;
                        </div>
                        
                        {sessionDetails.summary.bullet_json && JSON.parse(sessionDetails.summary.bullet_json).length > 0 &&
                            <div className="mt-6 p-4 rounded-xl backdrop-blur-md border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                                <h3 
                                  className="font-semibold mb-3" 
                                  style={{ 
                                    color: 'var(--text-primary)',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                  }}
                                >
                                  Points clés :
                                </h3>
                                <ul className="space-y-2">
                                    {JSON.parse(sessionDetails.summary.bullet_json).map((point: string, index: number) => (
                                        <li 
                                          key={index} 
                                          className="flex items-start"
                                          style={{ 
                                            color: 'var(--text-secondary)',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                          }}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
                                          {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        }

                        {sessionDetails.summary.action_json && JSON.parse(sessionDetails.summary.action_json).length > 0 &&
                            <div className="mt-6 p-4 rounded-xl backdrop-blur-md border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                                <h3 
                                  className="font-semibold mb-3" 
                                  style={{ 
                                    color: 'var(--text-primary)',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                  }}
                                >
                                  Actions à suivre :
                                </h3>
                                <ul className="space-y-2">
                                    {JSON.parse(sessionDetails.summary.action_json).map((action: string, index: number) => (
                                        <li 
                                          key={index} 
                                          className="flex items-start"
                                          style={{ 
                                            color: 'var(--text-secondary)',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                          }}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
                                          {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        }
                    </Section>
                )}
                
                {sessionDetails.transcripts && sessionDetails.transcripts.length > 0 && (
                    <Section title="Écouter: Transcription">
                        <div className="space-y-4">
                            {sessionDetails.transcripts.map((item) => (
                                <div 
                                  key={item.id} 
                                  className="p-4 rounded-xl backdrop-blur-md border border-white/10" 
                                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                >
                                    <span 
                                      className="font-semibold capitalize block mb-2" 
                                      style={{ 
                                        color: 'var(--text-primary)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                      }}
                                    >
                                      {item.speaker}:
                                    </span>
                                    <p 
                                      style={{ 
                                        color: 'var(--text-secondary)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        lineHeight: '1.6'
                                      }}
                                    >
                                      {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}
                
                {askMessages.length > 0 && (
                    <Section title="Demander: Q&A">
                        <div className="space-y-4">
                            {askMessages.map((item) => (
                                <div 
                                  key={item.id} 
                                  className="p-4 rounded-xl backdrop-blur-md border border-white/10" 
                                  style={{ 
                                    backgroundColor: item.role === 'user' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.05)'
                                  }}
                                >
                                    <p 
                                      className="font-semibold capitalize text-sm mb-2" 
                                      style={{ 
                                        color: item.role === 'user' ? '#93c5fd' : 'var(--text-primary)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                      }}
                                    >
                                      {item.role === 'user' ? 'Vous' : 'IA'}
                                    </p>
                                    <p 
                                      className="whitespace-pre-wrap" 
                                      style={{ 
                                        color: 'var(--text-secondary)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        lineHeight: '1.6'
                                      }}
                                    >
                                      {item.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    </div>
  );
}

export default function SessionDetailsPage() {
  return (
    <Suspense fallback={
      <div 
        className="min-h-screen flex items-center justify-center relative" 
        style={{ 
          background: 'var(--main-surface-primary)', 
          color: 'var(--text-primary)',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--text-secondary)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </div>
      </div>
    }>
      <SessionDetailsContent />
    </Suspense>
  );
} 
