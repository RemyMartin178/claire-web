'use client'

/**
 * Onboarding Claire — carrousel plein écran (parité Cluely).
 * Machine d'étapes : permissions (macOS) → réponse ⏎ → masquer → déplacer → notes → indétectable.
 * La complétion est persistée côté Firestore via completeOnboarding() (inchangé).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'
import { completeOnboarding } from '@/utils/api'
import { ONBOARDING_COMPLETED_EVENT } from '@/components/ConditionalLayout'
import {
  AskStep,
  HideStep,
  InvisibleStep,
  MoveStep,
  NotesStep,
  PaywallStep,
  PermissionsStep,
  type StepProps,
} from './steps'

type StepId = 'permissions' | 'ask' | 'hide' | 'move' | 'notes' | 'invisible' | 'paywall'

const STEP_COMPONENTS: Record<StepId, ComponentType<StepProps>> = {
  permissions: PermissionsStep,
  ask: AskStep,
  hide: HideStep,
  move: MoveStep,
  notes: NotesStep,
  invisible: InvisibleStep,
  paywall: PaywallStep,
}

const EASE = [0.22, 1, 0.36, 1] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const platform = (window as any).api?.platform
    // Hors Electron (dev navigateur), on garde le rendu macOS par défaut.
    if (platform) setIsMac(platform.isMacOS === true)
    setMounted(true)
  }, [])

  const steps = useMemo<StepId[]>(() => {
    const base: StepId[] = ['ask', 'hide', 'move', 'notes', 'invisible', 'paywall']
    // L'étape permissions n'a de réalité système que sur macOS — pas de fausse UI sur Windows.
    return isMac ? ['permissions', ...base] : base
  }, [isMac])

  const finish = useCallback(async () => {
    if (finishing) return
    setFinishing(true)
    setError(null)
    try {
      await completeOnboarding()
      window.dispatchEvent(new Event(ONBOARDING_COMPLETED_EVENT))
      router.replace('/activity')
    } catch {
      setError("Impossible d'enregistrer votre progression. Vérifiez votre connexion puis réessayez.")
      setFinishing(false)
    }
  }, [finishing, router])

  // Transition orchestrée à la main : fondu de sortie → swap d'étape →
  // fondu d'entrée. Le déclencheur normal est onAnimationComplete, mais un
  // onglet non focalisé peut throttle/suspendre le rAF de framer-motion et ne
  // jamais l'appeler — un timer de secours (durée de sortie + marge) garantit
  // qu'on avance quand même plutôt que de rester bloqué indéfiniment.
  const [visible, setVisible] = useState(true)
  const leavingRef = useRef(false)
  const fallbackTimerRef = useRef<number | null>(null)

  const advance = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    if (!leavingRef.current) return
    setStepIndex(i => Math.min(i + 1, steps.length - 1))
    leavingRef.current = false
    setVisible(true)
  }, [steps.length])

  const next = useCallback(() => {
    if (leavingRef.current) return
    if (stepIndex >= steps.length - 1) {
      void finish()
      return
    }
    leavingRef.current = true
    setVisible(false)
    fallbackTimerRef.current = window.setTimeout(advance, 400)
  }, [stepIndex, steps.length, finish, advance])

  const onStepAnimDone = useCallback(
    (def: string) => {
      if (def === 'hidden') advance()
    },
    [advance]
  )

  if (!mounted) return <div className="h-screen w-screen bg-[#09090b]" />

  const stepId = steps[Math.min(stepIndex, steps.length - 1)]
  const Step = STEP_COMPONENTS[stepId]

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-screen w-screen overflow-hidden bg-[#09090b]">
        {/* Bande de drag en haut (feux tricolores natifs macOS à gauche) */}
        <div className="app-region-drag absolute inset-x-0 top-0 z-50 h-10" />

        <motion.div
          initial="enter"
          animate={visible ? 'shown' : 'hidden'}
          variants={{
            enter: { opacity: 0, y: 26, scale: 0.985 },
            shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
            hidden: { opacity: 0, y: -18, scale: 0.99, transition: { duration: 0.22, ease: 'easeIn' } },
          }}
          onAnimationComplete={onStepAnimDone}
          className="h-full w-full"
        >
          <Step key={stepId} isMac={isMac} onNext={next} finishing={finishing} />
        </motion.div>

        {error && (
          <p
            role="alert"
            className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    </MotionConfig>
  )
}
