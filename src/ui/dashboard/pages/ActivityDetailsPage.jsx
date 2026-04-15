import React, { useState, useEffect } from 'react'
import { useAuth } from '../DashboardApp.jsx'
import { getSessionWithSummary, deleteSession } from '../ipcDb.js'

function parseBullets(summary) {
  if (!summary) return []
  if (summary.bullet_json) {
    try {
      const parsed = typeof summary.bullet_json === 'string'
        ? JSON.parse(summary.bullet_json) : summary.bullet_json
      if (Array.isArray(parsed)) return parsed.map(b => String(b).replace(/\*\*/g, ''))
    } catch {}
  }
  const text = summary.text || ''
  const lines = text.split('\n').filter(l => /^[-•*]\s/.test(l.trim()))
  if (lines.length > 0) return lines.map(l => l.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '').trim())
  return []
}

function formatTs(ts) {
  if (!ts) return ''
  const ms = typeof ts === 'number' ? ts : (ts.toMillis ? ts.toMillis() : 0)
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDur(startMs, endMs) {
  if (!endMs || !startMs) return null
  const sec = Math.floor((endMs - startMs) / 1000)
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m} min ${s.toString().padStart(2, '0')} s`
}

// Parse markdown summary text into React elements (Apple/Tailwind style)
function parseSummaryMarkdown(text, onCopy) {
  if (!text) return null
  const cleanText = text
    .replace(/\*\*Title\*\*\n[\s\S]*?\n/, '')
    .replace(/## Actions sugg[eé]r[eé]es[\s\S]*?(?=## |$)/gi, '')
    .replace(/## Type[\s\S]*?(?=## |$)/gi, '')

  const lines = cleanText.split('\n')
  const elements = []
  let currentList = null
  let paragraphBuffer = []
  let firstH2 = true

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    const pText = paragraphBuffer.join(' ')
    const parts = pText.split(/(\*\*.*?\*\*)/g)
    elements.push(
      <p key={`p-${elements.length}`} className="mb-4 text-[#1d1d1f] text-[15px] leading-relaxed">
        {parts.map((p, k) => p.startsWith('**') && p.endsWith('**')
          ? <strong key={k} className="font-semibold">{p.slice(2, -2)}</strong> : p)}
      </p>
    )
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!currentList) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc pl-4 space-y-3 mb-6 marker:text-[#86868b] text-[#1d1d1f]">
        {currentList.map((item, idx) => (
          <li key={idx} className="text-[15px] leading-relaxed pl-1">
            {item.content.replace(/\*\*/g, '')}
            {item.subItems.length > 0 && (
              <ul className="list-disc pl-5 mt-2 space-y-1.5 marker:text-[#86868b] text-[#86868b] text-[14px]">
                {item.subItems.map((sub, sIdx) => (
                  <li key={sIdx} className="leading-relaxed">{sub.replace(/\*\*/g, '')}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    )
    currentList = null
  }

  for (const line of lines) {
    if (line.trim().startsWith('## ')) {
      flushParagraph(); flushList()
      const headerText = line.replace('## ', '').trim()
      const showCopy = firstH2 && onCopy
      firstH2 = false
      elements.push(
        <div key={`h2-${elements.length}`} className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{headerText}</h2>
          {showCopy && (
            <button onClick={onCopy} className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors">
              <CopyIcon size={13} /> Copier le résumé
            </button>
          )}
        </div>
      )
      continue
    }
    if (line.trim().startsWith('### ')) {
      flushParagraph(); flushList()
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-[15px] font-semibold mt-5 mb-3 text-[#1d1d1f]">
          {line.replace('### ', '').trim()}
        </h3>
      )
      continue
    }
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      flushParagraph()
      const indent = (line.match(/^(\s*)/) || ['', ''])[1].length
      const content = line.trim().substring(2).trim()
      if (indent > 0 && currentList && currentList.length > 0) {
        currentList[currentList.length - 1].subItems.push(content)
      } else {
        if (!currentList) currentList = []
        currentList.push({ content, subItems: [] })
      }
      continue
    }
    if (line.trim() === '') {
      flushParagraph(); flushList(); continue
    }
    flushList()
    paragraphBuffer.push(line.trim())
  }

  flushParagraph(); flushList()
  return elements
}

const CopyIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

const SpinnerIcon = () => (
  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
)

export default function ActivityDetailsPage({ navigate, sessionId }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!user || !sessionId) return
    setLoading(true)
    getSessionWithSummary(user.uid, sessionId)
      .then(d => setData(d))
      .catch(e => console.error('[ActivityDetailsPage]', e))
      .finally(() => setLoading(false))
  }, [user, sessionId])

  const handleCopySummary = () => {
    if (!data?.summary) return
    const bullets = parseBullets(data.summary)
    const text = bullets.length > 0
      ? bullets.map(b => `- ${b}`).join('\n')
      : (data.summary.text || '').replace(/\*\*/g, '').replace(/## /g, '').trim()
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyTranscript = () => {
    if (!data?.transcripts) return
    const text = data.transcripts.map(t => {
      const speaker = t.speaker === 'user' ? (user.displayName || 'Vous') : 'Autre'
      return `${speaker}:\n${t.text}\n`
    }).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    try {
      await deleteSession(user.uid, sessionId)
      navigate('activity')
    } catch (e) { console.error('[ActivityDetailsPage] delete', e) }
    finally { setShowDeleteConfirm(false) }
  }

  const startMs = data?.session ? (typeof (data.session.startedAt || data.session.started_at) === 'number'
    ? (data.session.startedAt || data.session.started_at)
    : 0) : 0
  const endMs = data?.session ? (typeof (data.session.endedAt || data.session.ended_at) === 'number'
    ? (data.session.endedAt || data.session.ended_at)
    : 0) : 0

  let displayTitle = data?.session?.title || 'Discussion avec Claire'
  if (displayTitle.includes('Session @') || displayTitle === 'Session Sans Titre') displayTitle = 'Discussion avec Claire'

  const bullets = data?.summary ? parseBullets(data.summary) : []

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back button */}
        <button
          onClick={() => navigate('activity')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d1d1f] transition-colors mb-6"
        >
          <BackIcon /> Retour à l'activité
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <SpinnerIcon />
          </div>
        ) : !data ? (
          <p className="text-sm text-gray-400">Session introuvable.</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-black mb-1">{displayTitle}</h1>
                <p className="text-sm text-gray-400">
                  {formatTs(startMs || data.session.startedAt || data.session.started_at)}
                  {endMs && startMs ? ` · ${formatDur(startMs, endMs)}` : ''}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5"
              >
                <TrashIcon />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100 mb-6">
              {[
                { id: 'summary', label: 'Résumé' },
                { id: 'transcript', label: 'Transcription' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'text-[#1d1d1f] border-[#1d1d1f]'
                      : 'text-gray-500 border-transparent hover:text-[#1d1d1f]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Summary tab */}
            {activeTab === 'summary' && (
              <div>
                {!data.summary ? (
                  <p className="text-sm text-gray-400 py-4">Aucun résumé disponible.</p>
                ) : data.summary.text ? (
                  <div>
                    {parseSummaryMarkdown(data.summary.text, handleCopySummary)}
                  </div>
                ) : bullets.length > 0 ? (
                  <div className="relative">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Points clés</h2>
                      <button
                        onClick={handleCopySummary}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                      >
                        <CopyIcon size={13} />
                        {copied ? 'Copié !' : 'Copier le résumé'}
                      </button>
                    </div>
                    <ul className="list-disc pl-4 space-y-3 marker:text-[#86868b] text-[#1d1d1f]">
                      {bullets.map((b, i) => (
                        <li key={i} className="text-[15px] leading-relaxed pl-1">{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">Aucun résumé disponible.</p>
                )}
              </div>
            )}

            {/* Transcript tab */}
            {activeTab === 'transcript' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Transcription</h2>
                  {data.transcripts?.length > 0 && (
                    <button
                      onClick={handleCopyTranscript}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                    >
                      <CopyIcon size={13} />
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  )}
                </div>
                {!data.transcripts?.length ? (
                  <p className="text-sm text-gray-400 py-4">Aucune transcription disponible.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.transcripts.map((t, i) => {
                      const isUser = t.speaker === 'user'
                      return (
                        <div key={i} className="rounded-xl bg-gray-50 px-4 py-3 border-l-2 border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            {isUser ? (user.displayName || 'Vous') : 'Autre'}
                          </p>
                          <p className="text-[14px] text-[#1d1d1f] leading-relaxed">{t.text}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-semibold text-black mb-2">Supprimer cette session ?</p>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-neutral-100 text-[13px] font-medium text-gray-700 hover:bg-neutral-200 transition-colors" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button className="flex-1 py-2 rounded-lg bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
