import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../App.jsx'
import { getSessions, deleteSession, startClaire } from '../utils/api.js'

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

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

export default function Activity({ navigate }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [launching, setLaunching] = useState(false)

  const load = useCallback(async () => {
    if (!user?.uid) return
    try {
      const res = await getSessions(user.uid)
      setSessions((res?.sessions || res || []).filter(s => s.session_type !== 'ask'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteSession(user.uid, confirmId)
      setSessions(prev => prev.filter(s => s.id !== confirmId))
    } catch (e) { console.error(e) }
    finally { setConfirmId(null) }
  }

  const handleStartClaire = async () => {
    setLaunching(true)
    try { await startClaire() } catch (e) { console.error(e) }
    // Window will close itself after startClaire succeeds
    setTimeout(() => setLaunching(false), 3000)
  }

  // Group by date
  const groups = {}
  sessions.forEach(s => {
    const ms = toMs(s.startedAt || s.started_at)
    const d = new Date(ms)
    const key = d.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace('.', '')
    if (!groups[label]) groups[label] = []
    groups[label].push({ ...s, _ms: ms })
  })
  const sortedDates = Object.keys(groups).sort((a, b) => groups[b][0]._ms - groups[a][0]._ms)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-14">

        <h1 className="text-3xl font-semibold text-black mb-2">
          {greeting()}, {user?.displayName?.split(' ')[0] || 'toi'}
        </h1>

        {/* Démarrez Claire */}
        <button
          onClick={handleStartClaire}
          disabled={launching}
          className="mt-4 mb-8 flex items-center gap-2.5 px-5 py-3 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #1a63e8 100%)', boxShadow: '0 4px 16px rgba(79,142,247,0.35)' }}
        >
          {launching ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/>
            </svg>
          )}
          {launching ? 'Lancement…' : 'Démarrez Claire'}
        </button>

        {/* Sessions */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
            <p className="text-sm text-gray-400">Aucune conversation pour l'instant.</p>
            <p className="text-xs text-gray-300 mt-1">Lance Claire pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedDates.map(dateStr => (
              <div key={dateStr}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">{dateStr}</h3>
                <div className="space-y-0.5">
                  {groups[dateStr].map(s => {
                    const duration = formatDuration(s._ms, toMs(s.endedAt || s.ended_at))
                    const timeStr = new Date(s._ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
                    let title = s.title || 'Discussion avec Claire'
                    if (title.includes('Session @') || title === 'Session Sans Titre') title = 'Discussion avec Claire'
                    if (title.length > 45) title = title.substring(0, 42) + '…'

                    return (
                      <div
                        key={s.id}
                        className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                        onClick={() => navigate('activity-details', { sessionId: s.id })}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[15px] font-medium text-black hover:text-primary transition-colors block truncate">{title}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{duration}</span>
                          <span className="text-sm font-medium text-neutral-500 w-16 text-right">{timeStr}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                            onClick={e => { e.stopPropagation(); setConfirmId(s.id) }}
                          ><TrashIcon /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmId && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-semibold text-black mb-2">Supprimer cette activité ?</p>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-neutral-100 text-[13px] font-medium text-gray-700 hover:bg-neutral-200 transition-colors" onClick={() => setConfirmId(null)}>Annuler</button>
              <button className="flex-1 py-2 rounded-lg bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
