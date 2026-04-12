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
}

function getChecklistStorageKeys(userId: string) {
  const scopedUserId = userId || 'anonymous'

  return {
    dismissed: `cl_checklist_dismissed:${scopedUserId}`,
    downloaded: `cl_downloaded:${scopedUserId}`,
  }
}

function markChecklistDownloaded(userId: string) {
  const { downloaded } = getChecklistStorageKeys(userId)
  localStorage.setItem(downloaded, 'true')
  window.dispatchEvent(new CustomEvent('claire:download-clicked', {
    detail: { userId },
  }))
}

export default function GettingStartedChecklist({ allSessions, userId }: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const storageKeys = getChecklistStorageKeys(userId)

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKeys.dismissed) === 'true'
    setDismissed(isDismissed)
    setIsVisible(!isDismissed)
    setDownloaded(localStorage.getItem(storageKeys.downloaded) === 'true')
  }, [storageKeys.dismissed, storageKeys.downloaded])

  useEffect(() => {
    const handleDownloadClicked = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (!detail?.userId || detail.userId === userId) {
        localStorage.setItem(storageKeys.downloaded, 'true')
        setDownloaded(true)
      }
    }

    window.addEventListener('claire:download-clicked', handleDownloadClicked as EventListener)
    return () => {
      window.removeEventListener('claire:download-clicked', handleDownloadClicked as EventListener)
    }
  }, [storageKeys.downloaded, userId])

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
        markChecklistDownloaded(userId)
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
    localStorage.setItem(storageKeys.dismissed, 'true')
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
          className="mb-10 border border-neutral-200 rounded-2xl p-6 bg-neutral-50/50 select-none"
          style={{ overflow: 'hidden', transformOrigin: 'top center' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">
                Demarrer avec Claire
              </h2>
              <p className="text-[13px] text-[#86868B] mt-0.5">
                {allDone ? 'Vous etes pret !' : `${completedCount} sur ${steps.length} completees`}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 -mt-1 -mr-1 rounded-lg hover:bg-neutral-100"
              title="Masquer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="h-1 bg-neutral-200 rounded-full mb-5 overflow-hidden">
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
                  step.done ? 'opacity-50' : 'hover:bg-white'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step.done ? 'border-transparent' : 'border-neutral-300 bg-white'
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
                      step.done ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]'
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
