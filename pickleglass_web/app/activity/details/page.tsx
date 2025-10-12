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
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

type ConversationItem = (Transcript & { type: 'transcript' }) | (AiMessage & { type: 'ai_message' });

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-8">
        <h2 className="text-lg font-heading font-semibold mb-4 tracking-tight text-[#282828]">
            {title}
        </h2>
        <div className="space-y-3">
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      await deleteSession(sessionId);
      router.push('/activity');
    } catch (error) {
      alert('Échec de la suppression de l\'activité.');
      setDeleting(false);
      console.error(error);
    }
  };

  if (loading || isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des détails de la session...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (!userInfo) {
    return null;
  }

  if (!sessionDetails) {
    return (
      <Page>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-heading font-semibold mb-4 text-[#282828]">
            Session introuvable
          </h2>
          <p className="text-gray-600 mb-6">
            La session demandée n'a pas pu être trouvée.
          </p>
          <Button onClick={() => router.push('/activity')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'activité
          </Button>
        </div>
      </Page>
    )
  }
  
  const askMessages = sessionDetails.ai_messages || [];

  return (
    <Page>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/activity" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-[#282828] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </div>

        <Card className="bg-white">
          <CardContent className="p-8">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-heading font-semibold mb-3 text-[#282828]">
                  {sessionDetails.session.title || `Conversation du ${new Date(sessionDetails.session.started_at * 1000).toLocaleDateString()}`}
                </h1>
                <div className="flex items-center text-sm space-x-4 text-gray-600">
                  <span>
                    {new Date(sessionDetails.session.started_at * 1000).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>
                    {new Date(sessionDetails.session.started_at * 1000).toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                  </span>
                  <Badge variant={sessionDetails.session.session_type === 'ask' ? 'default' : 'secondary'}>
                    {sessionDetails.session.session_type === 'ask' ? 'Demander' : 'Écouter'}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="destructive"
                size="sm"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>

            {sessionDetails.summary && (
              <Section title="Résumé">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-lg italic text-gray-700">
                      "{sessionDetails.summary.tldr}"
                    </p>
                  </CardContent>
                </Card>
                
                {sessionDetails.summary.bullet_json && JSON.parse(sessionDetails.summary.bullet_json).length > 0 && (
                  <Card className="bg-white mt-6">
                    <CardContent className="p-4">
                      <h3 className="font-heading font-semibold mb-3 text-[#282828]">
                        Points clés :
                      </h3>
                      <ul className="space-y-2">
                        {JSON.parse(sessionDetails.summary.bullet_json).map((point: string, index: number) => (
                          <li key={index} className="flex items-start text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {sessionDetails.summary.action_json && JSON.parse(sessionDetails.summary.action_json).length > 0 && (
                  <Card className="bg-white mt-6">
                    <CardContent className="p-4">
                      <h3 className="font-heading font-semibold mb-3 text-[#282828]">
                        Actions à suivre :
                      </h3>
                      <ul className="space-y-2">
                        {JSON.parse(sessionDetails.summary.action_json).map((action: string, index: number) => (
                          <li key={index} className="flex items-start text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </Section>
            )}
            
            {sessionDetails.transcripts && sessionDetails.transcripts.length > 0 && (
              <Section title="Écouter: Transcription">
                <div className="space-y-4">
                  {sessionDetails.transcripts.map((item) => (
                    <Card key={item.id} className="bg-white">
                      <CardContent className="p-4">
                        <span className="font-semibold capitalize block mb-2 text-[#282828]">
                          {item.speaker}:
                        </span>
                        <p className="text-gray-600 leading-relaxed">
                          {item.text}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>
            )}
            
            {askMessages.length > 0 && (
              <Section title="Demander: Q&A">
                <div className="space-y-4">
                  {askMessages.map((item) => (
                    <Card key={item.id} className={item.role === 'user' ? 'bg-primary/5 border-primary/20' : 'bg-white'}>
                      <CardContent className="p-4">
                        <p className={`font-semibold capitalize text-sm mb-2 ${item.role === 'user' ? 'text-primary' : 'text-[#282828]'}`}>
                          {item.role === 'user' ? 'Vous' : 'IA'}
                        </p>
                        <p className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                          {item.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

export default function SessionDetailsPage() {
  return (
    <Suspense fallback={
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </Page>
    }>
      <SessionDetailsContent />
    </Suspense>
  );
}
