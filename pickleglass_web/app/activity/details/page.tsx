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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Share2, Play, ArrowUpRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import React from 'react'

// Util function to format seconds to m:ss
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Custom Markdown Renderer to bypass NPM install issues
const parseMarkdown = (text: string) => {
  if (!text) return null;
  // Remove the Title section completely since we show it in the header
  const cleanText = text.replace(/\*\*Title\*\*\n[\s\S]*?\n/, '');

  const blocks = cleanText.split('\n\n');
  return blocks.map((block, i) => {
    if (block.trim() === '') return null;

    // Headers
    if (block.startsWith('## ')) {
      const headerText = block.replace('## ', '').trim();
      return <h2 key={i} className="text-xl font-heading font-semibold mt-8 mb-4 tracking-tight">{headerText}</h2>;
    }
    if (block.startsWith('### ')) {
      const headerText = block.replace('### ', '').trim();
      return <h3 key={i} className="text-lg font-heading font-medium mt-6 mb-3">{headerText}</h3>;
    }

    // List blocks
    if (block.startsWith('- ')) {
      const listItems = block.split('\n').filter(line => line.trim().startsWith('- '));
      return (
        <ul key={i} className="list-disc pl-5 space-y-2 mb-6">
          {listItems.map((item, j) => {
            let content = item.replace(/^- /, '').trim();
            // Process bold tags natively
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={j} className="text-gray-600">
                {parts.map((p, k) => p.startsWith('**') && p.endsWith('**') ?
                  <strong key={k} className="font-semibold text-black">{p.slice(2, -2)}</strong> : p)}
              </li>
            );
          })}
        </ul>
      );
    }

    // Paragraphs
    const pParts = block.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} className="mb-4 text-gray-600">
        {pParts.map((p, k) => p.startsWith('**') && p.endsWith('**') ?
          <strong key={k} className="font-semibold text-black">{p.slice(2, -2)}</strong> : p)}
      </p>
    );
  });
};

type TabType = 'summary' | 'transcript' | 'usage';

const SectionHeader = ({ title, onAction, actionText }: { title: string, onAction?: () => void, actionText?: string }) => (
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-sans font-semibold text-black">
      {title}
    </h2>
    {onAction && actionText && (
      <button onClick={onAction} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v0m-4.3 0H12" /></svg>
        {actionText}
      </button>
    )}
  </div>
);

function SessionDetailsContent() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userInfo) {
      router.push('/auth/login');
    }
  }, [userInfo, loading, router]);

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
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
      toast.success('Session supprimée');
      router.push('/activity');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
      setDeleting(false);
      console.error(error);
    }
  };

  const handleCopySummary = () => {
    if (!sessionDetails?.summary) return;
    const { tldr, bullet_json, action_json } = sessionDetails.summary;
    let text = `${tldr}\n\n`;
    if (bullet_json) {
      const bullets = JSON.parse(bullet_json);
      if (bullets.length) text += `Points clés:\n${bullets.map((b: string) => `- ${b}`).join('\n')}\n\n`;
    }
    if (action_json) {
      const actions = JSON.parse(action_json);
      if (actions.length) text += `Actions:\n${actions.map((a: string) => `- ${a}`).join('\n')}\n\n`;
    }
    navigator.clipboard.writeText(text);
    toast.success('Résumé copié !');
  }

  const handleCopyTranscript = () => {
    if (!sessionDetails?.transcripts) return;
    const text = sessionDetails.transcripts.map(t => {
      const speakerName = t.speaker === 'user' ? (userInfo?.display_name || 'Vous') : 'Autre';
      return `${speakerName}:\n${t.text}\n`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Transcription copiée !');
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#282828] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500 font-body">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  if (!sessionDetails) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#282828] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-heading font-semibold mb-4">Session introuvable</h2>
        <p className="text-gray-500 mb-8 font-body">La session demandée n'a pas pu être trouvée.</p>
        <Button onClick={() => router.push('/activity')} className="bg-[#282828] text-white hover:bg-neutral-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'activité
        </Button>
      </div>
    )
  }

  const startDate = new Date(sessionDetails.session.started_at);
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(startDate);
  // Optional: Capitalize first letter of the weekday
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const askMessages = sessionDetails.ai_messages || [];

  let displayTitle = sessionDetails.session.title;
  const genericTitles = ['Session @', 'Session Sans Titre', 'Discussion avec Claire'];
  const isGeneric = !displayTitle || displayTitle.trim() === '' || genericTitles.some(t => displayTitle.includes(t));

  if (isGeneric && sessionDetails.summary?.tldr) {
    let cleanTldr = sessionDetails.summary.tldr.replace(/^(La discussion porte sur|La conversation porte sur|Ce \w+ porte sur|Le sujet est)\s*/i, '');
    displayTitle = cleanTldr.length > 50 ? cleanTldr.substring(0, 50) + '...' : cleanTldr;
  }

  // If still generic, ultimate fallback
  if (!displayTitle || displayTitle.trim() === '' || genericTitles.some(t => displayTitle.includes(t))) {
    displayTitle = `Discussion avec Claire`; // Fallback translation
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#282828] font-body selection:bg-primary/30">
      <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
        {/* Back Link */}
        <div className="mb-8 flex justify-between items-center">
          <Link
            href="/activity"
            className="inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'activité
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-200 hover:text-black h-8 text-xs font-medium">
              <Mail className="w-3.5 h-3.5 mr-2" />
              E-mail de suivi
            </Button>
            <Button variant="outline" size="sm" className="bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-200 hover:text-black h-8 text-xs font-medium">
              <Share2 className="w-3.5 h-3.5 mr-2" />
              Partager
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-transparent border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs font-medium ml-2"
            >
              {deleting ? '...' : 'Supprimer'}
            </Button>
          </div>
        </div>

        {/* Header Title */}
        <div className="mb-8">
          <div className="text-gray-500 text-sm mb-2">{displayDate}</div>
          <h1 className="text-3xl sm:text-4xl font-sans font-semibold text-black tracking-tight leading-tight">
            {displayTitle}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-full w-fit mb-10 border border-neutral-200">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'summary' ? 'bg-white text-[#282828] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Résumé
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'transcript' ? 'bg-white text-[#282828] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Transcription
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'usage' ? 'bg-white text-[#282828] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Utilisation
          </button>
        </div>

        {/* Tab Content: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-10 animate-fade-in">
            {sessionDetails.summary?.text ? (
              <div className="max-w-3xl">
                <SectionHeader title="Résumé" onAction={handleCopySummary} actionText="Copier le résumé complet" />
                <div className="prose prose-neutral max-w-none text-[#282828] leading-relaxed">
                  {parseMarkdown(sessionDetails.summary.text)}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 py-12 text-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                Aucun résumé disponible pour cette session.
              </div>
            )}
          </div>
        )}

        {/* Tab Content: TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div className="animate-fade-in max-w-2xl mx-auto ml-0">
            <div className="flex justify-end mb-6">
              <button onClick={handleCopyTranscript} className="text-sm text-gray-500 hover:text-black flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v0m-4.3 0H12" /></svg>
                Copier la transcription complète
              </button>
            </div>
            {sessionDetails.transcripts && sessionDetails.transcripts.length > 0 ? (
              <div className="space-y-8">
                {sessionDetails.transcripts.map((t, idx) => {
                  const isUser = t.speaker === 'user';
                  const speakerName = isUser ? userInfo.display_name : 'Autre';
                  const speakerColor = isUser ? 'text-primary' : 'text-neutral-500';

                  // Mocking timestamp conceptually, ideally we use t.start_at offset from session.started_at
                  // If start_at is unix, we subtract session start. 
                  let offsetText = "0:00";
                  if (t.start_at && sessionDetails.session.started_at) {
                    const offsetSec = Math.floor((t.start_at - sessionDetails.session.started_at) / 1000);
                    if (offsetSec >= 0) {
                      offsetText = formatTime(offsetSec);
                    }
                  }

                  return (
                    <div key={t.id || idx} className="group flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${speakerColor}`}>{speakerName}</span>
                        <span className="text-xs text-neutral-400 font-mono">{offsetText}</span>
                      </div>
                      <p className="text-[#282828] leading-relaxed text-[15px]">
                        {t.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-gray-400 py-12 text-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                Aucune transcription disponible.
              </div>
            )}
          </div>
        )}

        {/* Tab Content: USAGE */}
        {activeTab === 'usage' && (
          <div className="animate-fade-in max-w-3xl">
            <SectionHeader title="Utilisation de l'IA" />

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="text-neutral-500 text-sm mb-1">Requêtes effectuées</div>
                <div className="text-3xl font-sans font-semibold text-[#282828]">{askMessages.length}</div>
              </div>
              {sessionDetails.summary?.tokens_used && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-sm">
                  <div className="text-neutral-500 text-sm mb-1">Tokens utilisés (approx.)</div>
                  <div className="text-3xl font-sans font-semibold text-[#282828]">{sessionDetails.summary.tokens_used}</div>
                </div>
              )}
            </div>

            {askMessages.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-heading font-medium text-[#282828] mb-4">Requêtes textuelles</h3>
                <div className="border-l border-neutral-200 ml-3 space-y-8 pl-6">
                  {askMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[29px] w-3 h-3 rounded-full border-2 border-white ${msg.role === 'user' ? 'bg-primary' : 'bg-neutral-300'} top-1.5`}></div>

                      <span className={`text-xs font-semibold uppercase tracking-wider ${msg.role === 'user' ? 'text-primary' : 'text-neutral-500'} mb-2 block`}>
                        {msg.role === 'user' ? 'Vous (Question)' : 'Claire IA (Réponse)'}
                      </span>
                      <div className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-primary/5 border border-primary/20' : 'bg-white border border-neutral-200 text-gray-700 shadow-sm'}`}>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 py-12 text-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                Aucune requête IA enregistrée pour cette session.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-[600px] px-4 pointer-events-none z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-neutral-200 rounded-2xl p-2 shadow-xl flex items-center gap-2 pointer-events-auto">
          <button className="flex items-center gap-2 hover:bg-neutral-100 text-[#282828] px-4 py-2.5 rounded-xl transition-colors text-sm font-medium">
            <Play className="w-4 h-4 fill-[#282828]" />
            Reprendre la session
          </button>
          <div className="h-6 w-px bg-neutral-200 mx-1"></div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Poser une question sur cette réunion..."
              className="w-full bg-transparent border-none text-[#282828] text-sm focus:outline-none placeholder-gray-400 px-3 py-2"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-neutral-100 p-1 rounded-md text-neutral-500">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

    </div >
  );
}

export default function SessionDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <SessionDetailsContent />
    </Suspense>
  );
}
