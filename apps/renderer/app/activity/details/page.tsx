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
import { Button } from '@/components/ui/button'
import { Mic, Trash2, ArrowLeft, Copy, Mail } from 'lucide-react';
import { AiMessageWithActions } from '@/components/ui/ai-actions'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/conversation'
import { motion } from 'framer-motion';
import { trackSessionViewed } from '@/lib/gtag'
import { toast } from 'react-hot-toast'
import { LiquidGlassInput } from '@/components/ui/liquid-glass-input'
import ActivityDetailsLoading from './loading'
import React from 'react'

// Session context type detection

// Util function to format seconds to m:ss
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Custom Markdown Renderer to bypass NPM install issues, supporting nested lists and styled exactly like premium UI
const parseMarkdown = (text: string, onCopySummary?: () => void) => {
  if (!text) return null;
  // Remove the Title section and Actions suggérées section from display
  const cleanText = text
    .replace(/\*\*Title\*\*\n[\s\S]*?\n/, '')
    .replace(/## Actions sugg[eé]r[eé]es[\s\S]*?(?=## |$)/gi, '')
    .replace(/## Type[\s\S]*?(?=## |$)/gi, '');

  const lines = cleanText.split('\n');
  const elements = [];
  let currentList: { items: { content: string, subItems: string[] }[] } | null = null;
  let paragraphBuffer: string[] = [];
  let hasRenderedFirstH2 = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const pText = paragraphBuffer.join(' ');
      const pParts = pText.split(/(\*\*.*?\*\*)/g);
      elements.push(
        <p key={`p-${elements.length}`} className="mb-4 text-foreground text-[15px] leading-relaxed">
          {pParts.map((p, k) => p.startsWith('**') && p.endsWith('**') ?
            <strong key={k} className="font-semibold">{p.slice(2, -2)}</strong> : p)}
        </p>
      );
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-4 space-y-4 mb-8 marker:text-muted-foreground text-foreground">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="text-[15px] leading-relaxed pl-1">
              {item.content.replace(/\*\*/g, '')}
              {item.subItems.length > 0 && (
                <ul className="list-disc pl-5 mt-3 space-y-2 marker:text-muted-foreground text-muted-foreground text-[14px]">
                  {item.subItems.map((sub, sIdx) => (
                    <li key={sIdx} className="leading-relaxed">{sub.replace(/\*\*/g, '')}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Header 2
    if (line.trim().startsWith('## ')) {
      flushParagraph();
      flushList();
      const headerText = line.replace('## ', '').trim();
      const injectCopyBtn = !hasRenderedFirstH2 && onCopySummary;
      hasRenderedFirstH2 = true;

      elements.push(
        <div key={`h2-w-${elements.length}`} className="flex items-center justify-between mt-8 mb-5">
          <h2 className="text-[17px] font-semibold text-foreground font-sans">
            {headerText}
          </h2>
          {injectCopyBtn && (
            <button
              onClick={onCopySummary}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> Copier le résumé
            </button>
          )}
        </div>
      );
      continue;
    }

    // Header 3
    if (line.trim().startsWith('### ')) {
      flushParagraph();
      flushList();
      const headerText = line.replace('### ', '').trim();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-medium mt-6 mb-4 text-foreground">
          {headerText}
        </h3>
      );
      continue;
    }

    // List item (detect top level or nested by indentation)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      flushParagraph();
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const content = line.trim().substring(2).trim(); // Remove "- " or "* "

      // If we have an active list and the indent is 2 or more spaces, or tab, it's a subitem
      if (indent > 0 && currentList && currentList.items.length > 0) {
        currentList.items[currentList.items.length - 1].subItems.push(content);
      } else {
        // It's a top-level item
        if (!currentList) currentList = { items: [] };
        currentList.items.push({ content, subItems: [] });
      }
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular text (Paragraph continuation)
    flushList(); // End list if a regular paragraph starts
    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();

  return elements;
};

type TabType = 'summary' | 'transcript' | 'usage';

// Unused component removed for cleanup

function SessionDetailsContent() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userInfo) {
      router.push('/auth/login');
    }
  }, [userInfo, loading, router]);

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [sidebarInputValue, setSidebarInputValue] = useState("");
  const [isEmailing, setIsEmailing] = useState(false);
  // Shimmer animation on title when navigating from a just-ended session (?new=1)
  const [titleShimmer, setTitleShimmer] = useState(false);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const isNewSession = searchParams.get('new') === '1';

  // Start shimmer on title for ~3.2s when arriving from a just-ended session
  useEffect(() => {
    if (!isNewSession) return;
    setTitleShimmer(true);
    const t = setTimeout(() => setTitleShimmer(false), 3200);
    return () => clearTimeout(t);
  }, [isNewSession]);

  useEffect(() => {
    if (userInfo && sessionId) {
      const fetchDetails = async () => {
        setIsLoading(true);
        try {
          const details = await getSessionDetails(sessionId as string);
          setSessionDetails(details);
          // Initialize chat history with existing AI messages
          if (details?.ai_messages) {
            setChatHistory(details.ai_messages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })));
          }
          trackSessionViewed(sessionId);
        } catch (error) {
          console.error('Failed to load session details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [userInfo, sessionId]);

  const handleDeleteClick = async () => {
    if (!sessionId) return;
    setIsDeleting(true);
    try {
      await deleteSession(sessionId);
      toast.success('Session supprimée');
      router.push('/activity');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
      setIsDeleting(false);
    }
  };

  const handleCopySummary = () => {
    if (!sessionDetails?.summary) return;
    const { bullet_json, text: summaryText } = sessionDetails.summary;

    let bullets: string[] = [];
    if (bullet_json) {
      try { bullets = JSON.parse(bullet_json); } catch (_) {}
    }
    if (bullets.length === 0 && summaryText) {
      const matches = summaryText.match(/^- .+/gm);
      if (matches) bullets = matches.map(m => m.replace(/^- /, '').replace(/\*\*/g, '').trim());
    }

    const copyText = bullets.length > 0
      ? bullets.map(b => `- ${b.replace(/\*\*/g, '')}`).join('\n')
      : (summaryText || '').replace(/\*\*/g, '').replace(/## /g, '').trim();

    navigator.clipboard.writeText(copyText);
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

  const handleEmailSession = async () => {
    if (!sessionDetails) return;
    setIsEmailing(true);
    const toastId = toast.loading('Génération du mail...');
    try {
      const response = await fetch('/api/activity/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: sessionDetails.summary?.text || sessionDetails.transcripts?.map(t => t.text).join('\n') || sessionDetails.session.title,
          userName: userInfo?.display_name || userInfo?.email?.split('@')[0] || 'Utilisateur'
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la génération');
      const { subject, body } = await response.json();

      // Use anchor.click() trick - bypasses popup blocker after async calls
      const gmailUrl = `https://mail.google.com/mail/u/0/?tf=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const a = document.createElement('a');
      a.href = gmailUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Brouillon ouvert dans Gmail', { id: toastId });
    } catch (e) {
      toast.error("Impossible de générer l'email", { id: toastId });
    } finally {
      setIsEmailing(false);
    }
  };

  if (loading || isLoading) {
    // Reuse the route-level skeleton so the in-page loading state matches what
    // Next.js shows during the route transition — no jarring swap.
    return <ActivityDetailsLoading />
  }

  const handleAiQuestion = async (question: string) => {
    if (!question.trim() || !sessionDetails) return;

    setIsAiSidebarOpen(true);
    const historyWithUser = [...chatHistory, { role: 'user' as const, content: question }];
    // Batch: add user message + empty assistant placeholder in one update
    setChatHistory([...historyWithUser, { role: 'assistant' as const, content: '' }]);
    setIsAiLoading(true);

    try {
      // Prepare context: all transcripts
      const context = sessionDetails.transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyWithUser.map(m => ({ role: m.role, content: m.content })),
          context
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantReply = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantReply += chunk;

        // Update the last message in history
        setChatHistory(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantReply
            };
          }
          return updated;
        });
      }
    } catch (error) {
      toast.error("Claire n'a pas pu répondre.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!userInfo) {
    return null;
  }

  if (!sessionDetails) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Session introuvable</h2>
        <p className="text-muted-foreground mb-8 font-sans">La session demandée n'a pas pu être trouvée.</p>
        <Button onClick={() => router.push('/activity')} className="bg-[#1d1d1f] text-white hover:bg-black">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'activité
        </Button>
      </div>
    )
  }

  const startDate = new Date(sessionDetails.session.started_at);
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { month: 'short', day: 'numeric' }).format(startDate);

  // Calculate true duration if we have both start and end times
  let durationFormatted = "";
  if (sessionDetails.session.ended_at && sessionDetails.session.started_at) {
    const diffSec = Math.floor((sessionDetails.session.ended_at - sessionDetails.session.started_at) / 1000);
    const m = Math.floor(diffSec / 60);
    const s = Math.floor(diffSec % 60);
    durationFormatted = `${m}:${s.toString().padStart(2, '0')}`;
  } else {
    durationFormatted = "En cours";
  }

  // const askMessages = sessionDetails.ai_messages || []; // This is now handled by chatHistory state

  let displayTitle = sessionDetails.session.title;
  const genericTitles = ['Session @', 'Session Sans Titre', 'Discussion avec Claire'];
  const isGeneric = !displayTitle || displayTitle.trim() === '' || genericTitles.some(t => displayTitle.includes(t));

  let rawSummaryText = sessionDetails.summary?.text || '';

  // Use tldr (short title, 3-6 words) as primary title source when session title is generic
  if (isGeneric && sessionDetails.summary?.tldr) {
    const tldr = sessionDetails.summary.tldr.split('\n')[0].trim(); // Take first line only
    const cleanTldr = tldr
      .replace(/\*\*/g, '')
      .replace(/^(La discussion porte sur|La conversation porte sur|Ce \w+ porte sur|Le sujet est)\s*/i, '')
      .trim();
    if (cleanTldr && cleanTldr.length > 0) {
      // Cap at 40 chars (3-6 words max)
      displayTitle = cleanTldr.length > 40 ? cleanTldr.substring(0, 40).trimEnd() + '…' : cleanTldr;
    }
  }

  // Fallback: extract **Title** from raw summary text
  if (isGeneric || !displayTitle) {
    const titleRegex = /\*\*Title\*\*\s*\n+([^\n]+)/i;
    const titleMatch = rawSummaryText.match(titleRegex);
    if (titleMatch) {
      displayTitle = titleMatch[1].replace(/\*\*/g, '').trim();
      rawSummaryText = rawSummaryText.replace(/\*\*Title\*\*\s*\n+[^\n]+\n?/, '');
    }
  }

  if (!displayTitle || displayTitle.trim() === '' || genericTitles.some(t => displayTitle.includes(t))) {
    displayTitle = 'Discussion avec Claire';
  }


  // Helper to remove emojis and redundant prefixes from summary text
  const stripEmojisAndPrefixes = (str: string) => {
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/^(Résumé|A retenir|Summary|TL;DR|Note)\s*:\s*/i, '')
      .trim();
  };

  // Fallback to parsing markdown if JSON is empty/null
  let bulletPoints = [];
  try {
    bulletPoints = sessionDetails.summary?.bullet_json ? JSON.parse(sessionDetails.summary.bullet_json) : [];
  } catch (e) { console.error("Error parsing bullet_json", e); }

  if (bulletPoints.length === 0 && sessionDetails.summary?.text) {
    // Basic extraction from markdown if JSON failed
    const matches = sessionDetails.summary.text.match(/^- .+/gm);
    // Remove emojis and prefixes from extracted bullets
    if (matches) bulletPoints = matches.map(m => stripEmojisAndPrefixes(m.replace(/^- /, '')));
  }

  const missedOpportunitiesCount = 6;

  const hasTranscript = sessionDetails.transcripts && sessionDetails.transcripts.length > 0;

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return bulletPoints.length > 0 ? (
          <ul className="list-disc pl-4 space-y-3 marker:text-muted-foreground">
            {bulletPoints.map((item: string, i: number) => (
              <li key={i} className="text-sm leading-relaxed text-foreground pl-1">
                {item.replace(/\*\*/g, '')}
              </li>
            ))}
          </ul>
        ) : rawSummaryText ? (
          <div className="max-w-none">
            {parseMarkdown(stripEmojisAndPrefixes(rawSummaryText), handleCopySummary)}
          </div>
        ) : (
          <p className="text-muted-foreground/80 text-sm">Aucun résumé disponible.</p>
        );
      case 'transcript':
        if (!hasTranscript) return <p className="text-muted-foreground/80 text-sm">Pas de transcription disponible.</p>;
        return (
          <div className="space-y-5">
            {sessionDetails.transcripts.map((t, idx) => {
              const isUser = t.speaker === 'user';
              const speakerName = isUser ? userInfo?.display_name || 'Vous' : 'Interlocuteur';
              let offsetText = '0:00';
              if (t.start_at && sessionDetails.session.started_at) {
                offsetText = formatTime(Math.floor((t.start_at - sessionDetails.session.started_at) / 1000));
              }
              return (
                <article key={t.id || idx} className="space-y-0.5">
                  <p className="flex items-center gap-2">
                    <span className={`font-medium text-[11px] ${isUser ? 'text-[#1562df]' : 'text-foreground/75'}`}>{speakerName}</span>
                    <span className="font-medium text-[10px] text-muted-foreground">{offsetText}</span>
                  </p>
                  <p className="text-foreground text-sm leading-snug">{t.text}</p>
                </article>
              );
            })}
          </div>
        );
      case 'usage':
        return chatHistory.length > 0 ? (
          <div className="space-y-2">
            {chatHistory.map((msg: any, idx: number) => (
              <AiMessageWithActions key={msg.id || idx} role={msg.role as 'user' | 'assistant'} content={msg.content} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground/80 text-sm">Aucun échange IA pour le moment.</p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-background text-foreground font-sans selection:bg-[#007aff]/10 flex overflow-hidden h-full">
      {/* Main Content Area */}
      <div className={`flex-1 min-h-0 overflow-y-auto pb-16 no-scrollbar transition-all duration-500 ${isAiSidebarOpen ? 'mr-[400px]' : 'mr-0'}`}>
        <div className="mx-auto w-full max-w-[42rem] px-6 pt-7 pb-6">

          {/* Header: metadata + actions */}
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-muted-foreground text-sm">
              {formattedDate}{durationFormatted ? ` · ${durationFormatted}` : ''}
            </p>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={handleEmailSession} disabled={isEmailing}                 className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium transition disabled:opacity-50">
                {isEmailing ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent" /> : <Mail className="w-3.5 h-3.5" strokeWidth={2} />}
                <span>{isEmailing ? 'Génération...' : 'Mail'}</span>
              </button>
              <button type="button" onClick={handleDeleteClick} disabled={isDeleting}                 className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-red-500 transition disabled:opacity-50">
                {isDeleting ? <div className="animate-spin w-3.5 h-3.5 border-2 border-current rounded-full border-t-transparent" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
              </button>
            </div>
          </div>

          {/* Title — shimmer animation when arriving from a just-ended session */}
          <h1 className={`mt-2 font-medium text-3xl leading-[1.03] tracking-tight transition-all ${titleShimmer ? 'cluely-text-shimmer' : 'text-foreground'}`}>
            {displayTitle}
          </h1>

          {/* Tabs row + copy button */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="inline-flex self-start rounded-lg border border-[#e4e4e7] dark:border-white/10 bg-[#ebebeb] dark:bg-[#1e1e21] p-1">
              {(['summary', 'transcript', 'usage'] as TabType[]).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`relative rounded-md px-2 py-1 font-medium text-xs transition ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {activeTab === tab && (
                    <motion.span layoutId="session-tabs-active-pill"
                      className="absolute inset-0 rounded-md bg-white dark:bg-[#09090b] shadow-sm"
                      transition={{ type: 'spring', bounce: 0.22, damping: 18, mass: 0.28, stiffness: 560 }} />
                  )}
                  <span className="relative z-10">
                    {tab === 'summary' ? 'Résumé' : tab === 'transcript' ? 'Transcription' : 'Utilisation'}
                  </span>
                </button>
              ))}
            </div>
            {activeTab === 'summary' && (
              <button type="button" onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium transition">
                <Copy className="w-3 h-3" /> Copier
              </button>
            )}
            {activeTab === 'transcript' && hasTranscript && (
              <button type="button" onClick={handleCopyTranscript}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium transition">
                <Copy className="w-3 h-3" /> Copier
              </button>
            )}
          </div>

          {/* Content */}
          <section className="mt-6">
            {renderContent()}
          </section>

        </div>
      </div>

      {/* Liquid Glass Bottom Bar */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-[540px] px-6 z-50 transition-all duration-500 ease-apple ${isAiSidebarOpen ? 'translate-y-32 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-none'}`}>
        <div className="pointer-events-auto shadow-2xl rounded-3xl">
          <LiquidGlassInput
            placeholder="Posez une question à Claire..."
            onAction={handleAiQuestion}
          />
        </div>
      </div>

      {/* AI Chat Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-background shadow-2xl z-[60] transform transition-transform duration-500 ease-apple border-l border-border rounded-l-3xl ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-8 border-b border-border">
            <h2 className="text-xl font-semibold tracking-tight text-foreground uppercase">Claire</h2>
            <button
              onClick={() => setIsAiSidebarOpen(false)}
              className="p-2.5 rounded-full hover:bg-muted text-muted-foreground transition-colors z-[70] shadow-sm bg-muted/50 border border-border"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Sidebar Chat Interface */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Conversation className="flex-1 p-4">
              <ConversationContent>
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 pt-20">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-2">
                      <Mic className="text-[#007aff] size-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Posez vos questions</h3>
                    <p className="text-muted-foreground text-[15px]">
                      Je suis là pour vous aider à analyser cette session et répondre à toutes vos questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((msg: any, idx: number) => (
                      <AiMessageWithActions
                        key={msg.id || idx}
                        role={msg.role as 'user' | 'assistant'}
                        content={msg.content}
                      />
                    ))}
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
          {/* Local Sidebar Input */}
          <div className="p-6 border-t border-border">
            <div className="relative">
              <input
                type="text"
                value={sidebarInputValue}
                onChange={(e) => setSidebarInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sidebarInputValue.trim()) {
                    handleAiQuestion(sidebarInputValue);
                    setSidebarInputValue("");
                  }
                }}
                placeholder="Répondre à Claire..."
                className="w-full bg-muted border-none rounded-2xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#007aff]/20 transition-all outline-none pr-10"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => {
                    if (sidebarInputValue.trim()) {
                      handleAiQuestion(sidebarInputValue);
                      setSidebarInputValue("");
                    }
                  }}
                  className="btn-primary-icon"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <SessionDetailsContent />
    </Suspense>
  );
}
