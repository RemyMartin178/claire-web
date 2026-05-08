'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Session } from '@/utils/api'

const DOWNLOAD_URL = '/api/download'

interface Step {
  id: string
  label: string
  description: string
  done: boolean
  action?: () => void
  actionLabel?: string
}

interface GettingStartedChecklistProps {
  allSessions: Session[]
  userId: string
  userAliases?: string[]
}

function getScopedIds(userId: string, userAliases: string[] = []) {
  return Array.from(new Set([userId, ...userAliases].filter(Boolean)))
}

function getChecklistStorageKey(prefix: 'cl_checklist_dismissed' | 'cl_downloaded', scopedUserId: string) {
  return `${prefix}:${scopedUserId || 'anonymous'}`
}

function readScopedFlag(prefix: 'cl_checklist_dismissed' | 'cl_downloaded', scopedIds: string[]) {
  return scopedIds.some((scopedId) => localStorage.getItem(getChecklistStorageKey(prefix, scopedId)) === 'true')
}

function writeScopedFlag(prefix: 'cl_checklist_dismissed' | 'cl_downloaded', scopedIds: string[]) {
  scopedIds.forEach((scopedId) => {
    localStorage.setItem(getChecklistStorageKey(prefix, scopedId), 'true')
  })
}

function markChecklistDownloaded(scopedIds: string[]) {
  writeScopedFlag('cl_downloaded', scopedIds)
  window.dispatchEvent(new CustomEvent('claire:download-clicked', {
    detail: { scopedIds },
  }))
}

export default function GettingStartedChecklist({ allSessions, userId, userAliases = [] }: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const scopedIds = getScopedIds(userId, userAliases)

  useEffect(() => {
    const isDismissed = readScopedFlag('cl_checklist_dismissed', scopedIds)
    setDismissed(isDismissed)
    setIsVisible(!isDismissed)
    setDownloaded(readScopedFlag('cl_downloaded', scopedIds))
  }, [userId, userAliases.join('|')])

  useEffect(() => {
    const handleDownloadClicked = (event: Event) => {
      const detail = (event as CustomEvent<{ scopedIds?: string[] }>).detail
      const incomingIds = detail?.scopedIds || []
      const matchesCurrentUser = incomingIds.length === 0 || incomingIds.some((id) => scopedIds.includes(id))

      if (matchesCurrentUser) {
        writeScopedFlag('cl_downloaded', scopedIds)
        setDownloaded(true)
      }
    }

    window.addEventListener('claire:download-clicked', handleDownloadClicked as EventListener)
    return () => {
      window.removeEventListener('claire:download-clicked', handleDownloadClicked as EventListener)
    }
  }, [userId, userAliases.join('|')])

  const hasListenSession = allSessions.some((s) => s.session_type !== 'ask')
  const isAppDownloaded = downloaded || hasListenSession

  const steps: Step[] = [
    {
      id: 'account',
      label: 'Creer un compte',
      description: 'Votre compte Claire est actif.',
      done: true,
    },
    {
      id: 'download',
      label: 'Telecharger Claire',
      description: 'Installez Claire sur votre ordinateur.',
      done: isAppDownloaded,
      action: () => {
        markChecklistDownloaded(scopedIds)
        setDownloaded(true)
        window.open(DOWNLOAD_URL, '_blank')
      },
      actionLabel: 'Telecharger ->',
    },
    {
      id: 'meeting',
      label: 'Lancer une premiere reunion',
      description: 'Demarrez une session d ecoute dans l app.',
      done: hasListenSession,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const progressPct = Math.round((completedCount / steps.length) * 100)

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => handleDismiss(), 3000)
      return () => clearTimeout(timer)
    }
  }, [allDone])

  const handleDismiss = () => {
    if (dismissed || !isVisible) return
    writeScopedFlag('cl_checklist_dismissed', scopedIds)
    setIsVisible(false)
  }

  if (dismissed) return null

  return (
    <AnimatePresence
      onExitComplete={() => {
        setDismissed(true)
      }}
    >
      {isVisible && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -22, scale: 0.94, filter: 'blur(8px)', height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 border border-border rounded-2xl p-6 bg-muted/30 dark:bg-white/[0.03] select-none"
          style={{ overflow: 'hidden', transformOrigin: 'top center' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                Demarrer avec Claire
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {allDone ? 'Vous etes pret !' : `${completedCount} sur ${steps.length} completees`}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1 rounded-lg hover:bg-muted"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="h-1 bg-border rounded-full mb-5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#1562df' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                  step.done ? 'opacity-50' : 'hover:bg-muted/60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step.done ? 'border-transparent' : 'border-border bg-background'
                  }`}
                  style={step.done ? { background: '#1562df', borderColor: '#1562df' } : {}}
                >
                  {step.done && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[14px] font-medium ${
                      step.done ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {!step.done && step.action && (
                  <button
                    onClick={step.action}
                    className="text-[13px] font-medium transition-opacity hover:opacity-70 flex-shrink-0"
                    style={{ color: '#1562df' }}
                  >
                    {step.actionLabel}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
