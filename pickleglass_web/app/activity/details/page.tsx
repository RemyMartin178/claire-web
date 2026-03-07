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
import {
  Mic,
  Calendar,
  Clock,
  Trash2,
  MoreVertical,
  FileText,
  MessageSquare,
  PieChart,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { TextShimmer } from '@/components/ui/text-shimmer'
import { AiMessageWithActions } from '@/components/ui/ai-actions'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/conversation'
import { Message, MessageContent } from '@/components/ui/message'
import { motion, AnimatePresence } from 'framer-motion';
import { trackSessionViewed } from '@/lib/gtag'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { LiquidGlassInput } from '@/components/ui/liquid-glass-input'
import React from 'react'

// Util function to format seconds to m:ss
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Custom Markdown Renderer to bypass NPM install issues, supporting nested lists and styled exactly like premium UI
const parseMarkdown = (text: string, onCopySummary?: () => void) => {
  if (!text) return null;
  // Remove the Title section completely since we show it in the header
  const cleanText = text.replace(/\*\*Title\*\*\n[\s\S]*?\n/, '');

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
        <p key={`p-${elements.length}`} className="mb-4 text-[#1d1d1f] text-[15px] leading-relaxed">
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
        <ul key={`ul-${elements.length}`} className="list-disc pl-4 space-y-4 mb-8 marker:text-[#86868b] text-[#1d1d1f]">
          {currentList.items.map((item, idx) => {
            const parts = item.content.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={idx} className="text-[15px] leading-relaxed pl-1">
                {parts.map((p, k) => p.startsWith('**') && p.endsWith('**') ?
                  <strong key={k} className="font-semibold">{p.slice(2, -2)}</strong> : p)}
                {item.subItems.length > 0 && (
                  <ul className="list-disc pl-5 mt-3 space-y-2 marker:text-[#86868b] text-[#86868b] text-[14px]">
                    {item.subItems.map((sub, sIdx) => {
                      const sParts = sub.split(/(\*\*.*?\*\*)/g);
                      return (
                        <li key={sIdx} className="leading-relaxed">
                          {sParts.map((p, k) => p.startsWith('**') && p.endsWith('**') ?
                            <strong key={k} className="font-semibold text-[#1d1d1f]">{p.slice(2, -2)}</strong> : p)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
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
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] font-sans">
            {headerText}
          </h2>
          {injectCopyBtn && (
            <button
              onClick={onCopySummary}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
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
        <h3 key={`h3-${elements.length}`} className="text-lg font-medium mt-6 mb-4 text-[#1d1d1f]">
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [sidebarInputValue, setSidebarInputValue] = useState("");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

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

  const handleDeleteClick = () => {
    setConfirmDeleteId(true);
  }

  const handleConfirmDelete = async () => {
    if (!sessionId) return;
    setIsDeleting(true);
    try {
      await deleteSession(sessionId);
      toast.success('Session supprimée');
      router.push('/activity');
    } catch (error) {
      toast.error('Échec de la suppression de l\'activité.');
      console.error(error);
      setIsDeleting(false);
    } finally {
      setConfirmDeleteId(false);
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
      <div className="min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d1d1f] mx-auto"></div>
          <p className="mt-4 text-[#86868b] font-sans">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  const handleAiQuestion = async (question: string) => {
    if (!question.trim() || !sessionDetails) return;

    setIsAiSidebarOpen(true);
    const newHistory = [...chatHistory, { role: 'user' as const, content: question }];
    setChatHistory(newHistory);
    setIsAiLoading(true);

    try {
      // Prepare context: all transcripts
      const context = sessionDetails.transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          context
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // Add temporary assistant message
      setChatHistory(prev => [...prev, { role: 'assistant', content: '' }]);

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
      console.error("AI Error:", error);
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
      <div className="min-h-screen bg-white text-[#282828] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-[#1d1d1f]">Session introuvable</h2>
        <p className="text-[#86868b] mb-8 font-sans">La session demandée n'a pas pu être trouvée.</p>
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

  // Extract title if AI outputted one right before the first Résumé section
  const titleRegex = /^\s*(?:##?\s*)?(?:Résumé\s*\n+)?(?:Title:\s*)?\**([^\n]+)\**\s*\n+\s*(?:##?\s*Résumé)/i;
  const titleMatch = rawSummaryText.match(titleRegex);
  if (titleMatch) {
    if (isGeneric) displayTitle = titleMatch[1].replace(/\*\*/g, '').trim();
    rawSummaryText = rawSummaryText.replace(titleRegex, '## Résumé\n');
  } else if (isGeneric && sessionDetails.summary?.tldr) {
    let cleanTldr = sessionDetails.summary.tldr.replace(/^(La discussion porte sur|La conversation porte sur|Ce \w+ porte sur|Le sujet est)\s*/i, '');
    displayTitle = cleanTldr.length > 50 ? cleanTldr.substring(0, 50) + '...' : cleanTldr;
  }

  if (!displayTitle || displayTitle.trim() === '' || genericTitles.some(t => displayTitle.includes(t))) {
    displayTitle = `Discussion avec Claire`;
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

  let actionItems: string[] = [];
  try {
    if (sessionDetails.summary?.action_json) {
      actionItems = JSON.parse(sessionDetails.summary.action_json);
    }
  } catch (e) { console.error("Error parsing action_json", e); }

  if (actionItems.length === 0 && sessionDetails.summary?.text) {
    // Try explicit section first
    const actionSection = sessionDetails.summary.text.split(/###?\s*(?:Action items|Actions requises|Actions à entreprendre)/i)[1];
    const targetText = actionSection || sessionDetails.summary.text;
    const matches = targetText.match(/^[*-]\s+.+/gm);
    if (matches) {
      actionItems = matches.map(m => m.replace(/^[*-]\s+/, '').trim());
    }
  }

  const missedOpportunitiesCount = actionItems.length > 0 ? Math.min(actionItems.length + 2, 8) : 6;

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        const hasMarkdownHeaders = /^## /m.test(rawSummaryText);

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {hasMarkdownHeaders ? (
              <div className="max-w-none">
                {parseMarkdown(stripEmojisAndPrefixes(rawSummaryText), handleCopySummary)}
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mt-2 mb-5">
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f] font-sans">Résumé</h2>
                    <button
                      onClick={handleCopySummary}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copier le résumé
                    </button>
                  </div>
                  {bulletPoints.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-4 mb-8 marker:text-[#86868b] text-[#1d1d1f]">
                      {bulletPoints.map((item: string, i: number) => {
                        const parts = item.split(/(\*\*.*?\*\*)/g);
                        return (
                          <li key={i} className="text-[15px] leading-relaxed pl-1">
                            {parts.map((p: string, k: number) => p.startsWith('**') && p.endsWith('**') ?
                              <strong key={k} className="font-semibold">{p.slice(2, -2)}</strong> : p)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-[15px] leading-relaxed text-[#1d1d1f]">
                      {parseMarkdown(stripEmojisAndPrefixes(rawSummaryText))}
                    </div>
                  )}
                </div>
                {actionItems.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-[17px] font-semibold mb-5 text-[#1d1d1f] font-sans">À retenir</h2>
                    <ul className="list-disc pl-4 space-y-4 mb-8 marker:text-[#86868b] text-[#1d1d1f]">
                      {actionItems.map((item: string, i: number) => {
                        const parts = item.split(/(\*\*.*?\*\*)/g);
                        return (
                          <li key={i} className="text-[15px] leading-relaxed pl-1">
                            {parts.map((p: string, k: number) => p.startsWith('**') && p.endsWith('**') ?
                              <strong key={k} className="font-semibold">{p.slice(2, -2)}</strong> : p)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'transcript':
        const hasTranscript = sessionDetails.transcripts && sessionDetails.transcripts.length > 0;
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#1d1d1f]">Transcription</h2>
              {hasTranscript && (
                <button
                  onClick={handleCopyTranscript}
                  className="text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                >
                  Copier la transcription
                </button>
              )}
            </div>
            {hasTranscript ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
                {sessionDetails.transcripts.map((t, idx) => {
                  const isUser = t.speaker === 'user';
                  const speakerName = isUser ? userInfo?.display_name || 'Vous' : 'Interlocuteur';
                  let offsetText = "0:00";
                  if (t.start_at && sessionDetails.session.started_at) {
                    offsetText = formatTime(Math.floor((t.start_at - sessionDetails.session.started_at) / 1000));
                  }
                  return (
                    <div key={t.id || idx} className="flex gap-6 pb-6 border-b border-[#f0f0f0] last:border-0">
                      <div className="w-16 flex-shrink-0 text-[13px] font-medium text-[#94a3b8] pt-1">
                        {offsetText}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-[#8e8e93] uppercase tracking-wider mb-1">{speakerName}</p>
                        <p className="text-[15px] leading-relaxed text-[#1d1d1f]">
                          {t.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#86868b] italic text-[15px]">Pas de transcription disponible.</p>
            )}
          </div>
        );
      case 'usage':
        return (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div>
              <p className="text-[#1d1d1f] text-[15px] font-medium leading-relaxed">
                Claire a été utilisée {(sessionDetails.session as any).views || 2} fois au total.
              </p>
            </div>

            {/* AI Exchange History inside Usage */}
            <div>
              <h2 className="text-xl font-semibold mb-8 text-[#1d1d1f]">Historique des échanges</h2>
              {chatHistory.length > 0 ? (
                <div className="space-y-2">
                  {chatHistory.map((msg: any, idx: number) => (
                    <AiMessageWithActions
                      key={msg.id || idx}
                      role={msg.role as 'user' | 'assistant'}
                      content={msg.content}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[#8e8e93] text-[15px] italic">Aucun échange IA pour le moment.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans selection:bg-[#007aff]/10 flex overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-500 ease-apple h-screen overflow-y-auto no-scrollbar ${isAiSidebarOpen ? 'mr-[400px]' : 'mr-0'}`}>
        <div className="max-w-5xl mx-auto px-8 pt-4 pb-40">
          {/* Navigation */}
          <div className="mb-4">
            <Link href="/activity" className="inline-flex items-center text-[#94a3b8] hover:text-[#1d1d1f] transition-all group">
              <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
              <span className="text-[14px] font-medium">Retour</span>
            </Link>
          </div>

          {/* Title and Header Tags */}
          <div className="mb-6">
            <h1 className="text-3xl mb-4 font-semibold tracking-tight text-[#1d1d1f] font-sans">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <Mic className="h-3.5 w-3.5 text-[#007aff]" />
                <span className="text-[13px] font-medium text-[#1d1d1f]">Réunion</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#1d1d1f]/50" />
                <span className="text-[13px] font-medium text-[#1d1d1f]">{formattedDate}</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-[#1d1d1f]/50" />
                <span className="text-[13px] font-medium text-[#1d1d1f]">{durationFormatted}</span>
              </div>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="btn-danger ml-auto shadow-sm"
              >
                <span>
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Supprimer
                </span>
              </button>
            </div>
          </div>

          {/* White Segmented Control Navigation */}
          <div className="mb-6 mt-2">
            <div className="inline-flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
              {(['summary', 'transcript', 'usage'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-[12px] transition-all rounded-md whitespace-nowrap relative ${activeTab === tab
                    ? 'text-[#1d1d1f] font-semibold'
                    : 'text-[#8e8e93] hover:text-[#1d1d1f] font-medium'
                    }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white shadow-sm border border-gray-200/50 rounded-lg z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === 'summary' ? 'Résumé' : tab === 'transcript' ? 'Transcription' : 'Utilisation'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Area with Slide Animation */}
          <div className="relative mb-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>


          <ConfirmationModal
            isOpen={confirmDeleteId}
            title="Supprimer l'activité"
            message="Êtes-vous sûr de vouloir supprimer cette activité ?"
            confirmText="Supprimer"
            onCancel={() => setConfirmDeleteId(false)}
            onConfirm={handleConfirmDelete}
          />
        </div>
      </div>

      {/* Liquid Glass Bottom Bar */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-[540px] px-6 pointer-events-none z-50 transition-all duration-500 ${isAiSidebarOpen ? '-translate-x-[calc(50%+200px)]' : '-translate-x-1/2'}`}>
        <div className="pointer-events-auto shadow-2xl rounded-3xl">
          <LiquidGlassInput
            placeholder="Posez une question à Claire..."
            onAction={handleAiQuestion}
          />
        </div>
      </div>

      {/* AI Chat Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-apple border-l border-gray-100 rounded-l-3xl ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-8 border-b border-gray-100">
            <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f] uppercase">Claire</h2>
            <button
              onClick={() => setIsAiSidebarOpen(false)}
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors z-[70] shadow-sm bg-white border border-gray-100"
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
                    <div className="w-16 h-16 bg-[#f2f2f7] rounded-2xl flex items-center justify-center mb-2">
                      <Mic className="text-[#007aff] size-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1d1d1f]">Posez vos questions</h3>
                    <p className="text-[#8e8e93] text-[15px]">
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
          <div className="p-6 border-t border-gray-100">
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
                className="w-full bg-[#f2f2f7] border-none rounded-2xl px-4 py-3 text-[14px] text-[#1d1d1f] focus:ring-2 focus:ring-[#007aff]/20 transition-all outline-none pr-10"
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <SessionDetailsContent />
    </Suspense>
  );
}
