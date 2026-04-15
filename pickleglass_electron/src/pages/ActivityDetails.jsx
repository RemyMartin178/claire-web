import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../App.jsx'
import { getSession, deleteSession } from '../utils/api.js'

function toMs(ts) {
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (ts?.toMillis) return ts.toMillis()
  return 0
}

function formatDuration(startMs, endMs) {
  if (!endMs) return 'En cours'
  const sec = Math.floor((endMs - startMs) / 1000)
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

function renderSummary(text) {
  if (!text) return null
  const clean = text
    .replace(/\*\*Title\*\*\n[\s\S]*?\n/, '')
    .replace(/## Actions sugg[eé]r[eé]es[\s\S]*?(?=## |$)/gi, '')
    .replace(/## Type[\s\S]*?(?=## |$)/gi, '')

  const lines = clean.split('\n')
  const blocks = []
  let listItems = []

  const flushList = () => {
    if (!listItems.length) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-3 mb-6 marker:text-[#86868b]">
        {listItems.map((item, i) => (
          <li key={i} className="text-[15px] leading-relaxed text-[#1d1d1f]">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  lines.forEach((line) => {
    const t = line.trim()
    if (!t) { flushList(); return }
    if (t.startsWith('## ')) {
      flushList()
      blocks.push(<h2 key={`h2-${blocks.length}`} className="text-[17px] font-semibold text-[#1d1d1f] mt-8 mb-4">{t.replace(/^##\s+/, '')}</h2>)
      return
    }
    if (t.startsWith('- ')) { listItems.push(t.replace(/^- /, '')); return }
    flushList()
    blocks.push(<p key={`p-${blocks.length}`} className="text-[15px] leading-relaxed text-[#1d1d1f] mb-4">{renderInline(t)}</p>)
  })
  flushList()
  return blocks
}

function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

export default function ActivityDetails({ navigate, sessionId }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    if (!user?.uid || !sessionId) return
    try {
      const res = await getSession(user.uid, sessionId)
      setSession(res?.session || res || null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user, sessionId])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try {
      await deleteSession(user.uid, sessionId)
      navigate('activity')
    } catch (e) { console.error(e) }
  }

  const handleCopy = async () => {
    const summary = session?.summary || session?.ai_summary || ''
    if (summary) {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <p className="text-[15px] text-gray-400 mb-4">Session introuvable.</p>
        <button onClick={() => navigate('activity')} className="text-sm font-medium text-blue-500 hover:underline">
          Retour
        </button>
      </div>
    )
  }

  const startMs = toMs(session.startedAt || session.started_at)
  const endMs = toMs(session.endedAt || session.ended_at)
  const duration = formatDuration(startMs, endMs)
  const dateStr = new Date(startMs).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = new Date(startMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')

  let title = session.title || 'Discussion avec Claire'
  if (title.includes('Session @') || title === 'Session Sans Titre') title = 'Discussion avec Claire'

  const summary = session.summary || session.ai_summary || ''
  const transcript = session.transcript || session.transcription || []
  const aiMessages = session.ai_messages || session.aiMessages || []

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('activity')}
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-[#1d1d1f] transition-colors group"
          >
            <ArrowLeft />
            <span className="text-[14px] font-medium">Retour</span>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Title + meta */}
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-3">{title}</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#1d1d1f] bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateStr}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#1d1d1f] bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timeStr} · {duration}
          </span>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
            {['summary', 'transcript'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-[12px] transition-all rounded-md whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-[#1d1d1f] font-semibold bg-white shadow-sm border border-gray-200/50'
                    : 'text-[#8e8e93] hover:text-[#1d1d1f] font-medium'
                }`}
              >
                {tab === 'summary' ? 'Résumé' : 'Transcription'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'summary' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Résumé</h2>
              {summary && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                >
                  <CopyIcon />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              )}
            </div>
            {summary
              ? <div className="prose-sm max-w-none">{renderSummary(summary)}</div>
              : <p className="text-[15px] text-[#86868b] italic">Aucun résumé disponible.</p>
            }

            {aiMessages.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-4">Questions posées à Claire</h3>
                <div className="space-y-4">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className="space-y-1.5">
                      {msg.question && (
                        <div className="text-[14px] font-medium text-[#1d1d1f] bg-gray-50 rounded-xl px-4 py-2.5">{msg.question}</div>
                      )}
                      {msg.answer && (
                        <div className="text-[14px] text-[#4b5563] px-4 py-2.5 leading-relaxed">{msg.answer}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {transcript.length === 0 ? (
              <p className="text-[15px] text-[#86868b] italic">Aucune transcription disponible.</p>
            ) : (
              <div className="space-y-3">
                {transcript.map((entry, i) => {
                  const text = typeof entry === 'string' ? entry : (entry.text || entry.content || '')
                  const speaker = typeof entry === 'object' ? (entry.speaker || entry.role || '') : ''
                  const ts = typeof entry === 'object' ? entry.timestamp : null
                  return (
                    <div key={i} className="flex gap-3">
                      {speaker && (
                        <span className="text-[12px] font-semibold text-[#86868b] w-16 shrink-0 mt-0.5 uppercase">{speaker}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#1d1d1f] leading-relaxed">{text}</p>
                        {ts && <p className="text-[11px] text-[#86868b] mt-0.5">{ts}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-semibold text-black mb-2">Supprimer cette activité ?</p>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-neutral-100 text-[13px] font-medium text-gray-700 hover:bg-neutral-200 transition-colors" onClick={() => setConfirmDelete(false)}>Annuler</button>
              <button className="flex-1 py-2 rounded-lg bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
