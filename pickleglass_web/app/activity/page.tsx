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
      alert('Échec de la suppression de l\'activité.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-subtle-bg">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-heading font-semibold text-[#282828] mb-2">
            {getGreeting()}, {userInfo.display_name}
          </h1>
        </div>
        
        <div>
          <h2 className="text-2xl font-heading font-medium text-[#282828] mb-8 text-center">
            Votre activité passée
          </h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des conversations...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <Link 
                          href={`/activity/details?sessionId=${session.id}`} 
                          className="text-lg font-medium text-[#282828] hover:text-primary transition-colors"
                        >
                          {session.title || `Conversation - ${new Date(session.started_at * 1000).toLocaleDateString()}`}
                        </Link>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(session.started_at * 1000).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        variant="destructive"
                        size="sm"
                        className="ml-4"
                      >
                        {deletingId === session.id ? 'Suppression...' : 'Supprimer'}
                      </Button>
                    </div>
                    <Badge variant={session.session_type === 'ask' ? 'default' : 'secondary'}>
                      {session.session_type === 'ask' ? 'Demander' : session.session_type || 'Demander'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white">
              <CardContent className="text-center p-12">
                <p className="text-gray-600 mb-4">
                  Aucune conversation pour l'instant. Démarrez une conversation dans l'application de bureau pour voir votre activité ici.
                </p>
                <div className="text-sm text-gray-500">
                  💡 Astuce : Utilisez l'application de bureau pour avoir des conversations IA qui apparaîtront ici automatiquement.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
