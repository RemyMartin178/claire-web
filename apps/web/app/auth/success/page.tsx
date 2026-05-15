'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
import { Page } from '@/components/Page'
import { auth } from '@/utils/firebase'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, staggerChildren: 0.12 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  }
}

const checkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
  }
}

function SuccessContent() {
  const sp = useSearchParams()
  const flow = sp.get('flow')
  const sessionId = sp.get('session_id') || sp.get('sessionId')

  const state = useMemo(() => 'st-' + Math.random().toString(36).slice(2, 10), [])
  const deep = useMemo(() => {
    if (!sessionId) return null
    return `pickleglass://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`
  }, [sessionId, state])

  const isLocalElectronFlow = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const [status, setStatus] = useState<'opening' | 'redirecting' | 'connected' | 'failed'>('opening')
  const [details, setDetails] = useState('Ouverture de l application...')

  useEffect(() => {
    if (flow !== 'mobile') return

    let cancelled = false

    async function handleSuccess() {
      if (isLocalElectronFlow) {
        try {
          const user = auth.currentUser
          if (!user) {
            throw new Error('Utilisateur Firebase introuvable')
          }

          const idToken = await user.getIdToken(true)
          const response = await fetch('/electron-auth-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              idToken,
              timestamp: Date.now(),
            }),
          })

          if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(errorText || `Callback local refuse (${response.status})`)
          }

          if (!cancelled) {
            setStatus('connected')
            setDetails('Connexion locale terminee. Vous pouvez revenir dans Claire.')
          }
          return
        } catch (error: any) {
          if (!cancelled) {
            setStatus('failed')
            setDetails(error?.message || 'Connexion locale impossible')
          }
          return
        }
      }

      if (!deep) {
        setStatus('failed')
        setDetails('Session mobile introuvable')
        return
      }

      const t = setTimeout(() => {
        if (cancelled) return
        setStatus('redirecting')
        setDetails('Redirection en cours...')
        try { window.location.href = deep } catch {}
      }, 600)

      return () => clearTimeout(t)
    }

    const cleanupPromise = handleSuccess()

    return () => {
      cancelled = true
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === 'function') cleanup()
      })
    }
  }, [deep, flow, isLocalElectronFlow])

  if (flow !== 'mobile') return null

  const title = status === 'failed' ? 'Connexion interrompue' : 'Authentification reussie'
  const eyebrow = status === 'failed' ? 'ERREUR' : 'CONNEXION REUSSIE'

  return (
    <Page bleed={true} className="bg-white">
      <div className="min-h-screen flex flex-col items-center justify-start bg-white px-6 pt-[18vh] select-none overflow-hidden">
        <motion.div
          className="max-w-sm w-full flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="mb-14" variants={itemVariants}>
            <svg
              className="w-16 h-16"
              style={{ color: status === 'failed' ? '#dc2626' : '#1562df' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {status === 'failed'
                ? <motion.path d="M18 6L6 18M6 6l12 12" variants={checkVariants} />
                : <motion.path d="M20 6L9 17L4 12" variants={checkVariants} />}
            </svg>
          </motion.div>

          <motion.p
            className="text-[11px] font-semibold tracking-widest uppercase text-[#1562df] mb-4"
            variants={itemVariants}
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            className="text-[28px] font-medium tracking-tight text-[#1D1D1F] mb-3 text-center"
            variants={itemVariants}
          >
            {title}
          </motion.h1>

          <motion.p
            className="text-[#86868B] text-[17px] font-normal leading-relaxed text-center mb-16"
            variants={itemVariants}
          >
            {details}
          </motion.p>

          {!isLocalElectronFlow && deep && status !== 'failed' && (
            <motion.div className="flex flex-col items-center gap-1.5" variants={itemVariants}>
              <p className="text-[14px] font-medium text-[#86868B] text-center">
                {status === 'redirecting' ? 'Redirection en cours...' : 'Ouverture de l application...'}
              </p>
              <a
                href={deep}
                className="text-[13px] font-medium text-[#1D1D1F] underline underline-offset-4 hover:opacity-60 transition-opacity"
              >
                Cliquez ici si rien ne se passe
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Page>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
