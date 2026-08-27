'use client'

/**
 * Écrans du flow d'onboarding Claire (parité Cluely).
 *
 * Couleurs/composants réutilisés depuis l'app elle-même (pas de bleu Cluely) :
 *  - CTA : classe .btn-apple-premium.btn-hero-cta-premium (globals.css, déjà
 *    utilisée par electron-login et l'ancien écran d'onboarding).
 *  - Bleu de marque Claire : radial #1562df→#0c26a8 (electron-login "Ask panel
 *    mockup" / boutons d'envoi) — remplace le bleu Cluely (#497ee9/#82d8ff).
 *  - Panneau "Ask" glass : rgba(24,23,28,.55) + bordure rgba(207,226,255,.24)
 *    + blur(20px) (electron-login), au lieu d'un mockup inventé.
 *  - Photo d'appel : /zoom-mockup.jpg (déjà dans le repo, déjà utilisée par
 *    electron-login pour exactement ce cas d'usage).
 * Timing du lien "Passer" (apparition différée, désactivé avant) relevé dans
 * le bundle réel de Cluely (hide-demo-*.js : opacity/y/tabIndex/disabled tous
 * gatés sur le même flag, transition .24s easeOut).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  CornerDownLeft,
  Eye,
  FileText,
  Mic,
  Monitor,
  Sparkles,
  Users,
} from 'lucide-react'
import { startStripeCheckout } from '@/utils/api'

export interface StepProps {
  isMac: boolean
  onNext: () => void
  /** Uniquement sur la dernière étape */
  finishing?: boolean
}

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

const staggerParent = {
  initial: {},
  animate: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
}

/* ─────────────────────────── Tokens de marque Claire ──────────────────────── */

const BRAND_BLUE = 'radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0%, #0c26a8 100%)'
const BRAND_BLUE_SHADOW = '0 0 0 0.678px #0c44a1, inset 0 -1.355px #022c70, inset 0 0.678px #81b6ff'
const BRAND_ACCENT = '#1562df'

const KEY_IDLE_BG = 'linear-gradient(180deg, #2e3039 0%, #272a31 100%)'
const KEY_IDLE_SHADOW =
  '0 5px 12px rgba(0,0,0,0.16), 0 21px 21px rgba(0,0,0,0.13), inset 0 -1px #16171a, inset 0 0.5px rgba(175,179,196,0.6)'
const KEY_PRESSED_SHADOW = `0 0 0 0.5px ${BRAND_ACCENT}, 0 6px 26px rgba(21,98,223,0.55), inset 0 1px rgba(255,255,255,0.65)`

// Panneau "Ask" — glass réel (electron-login "Ask panel mockup"), pas un mockup inventé.
const ASK_PANEL_BG = 'rgba(24,23,28,0.55)'
const ASK_PANEL_BORDER = '1px solid rgba(207,226,255,0.24)'
const ASK_PANEL_SHADOW = '0 24px 56px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)'
const ASK_PANEL_HAIRLINE =
  'linear-gradient(90deg, transparent, rgba(255,255,255,0.13) 40%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.13) 60%, transparent)'

const TITLE_GRADIENT = 'linear-gradient(to right, rgba(255,255,255,0.98), rgba(255,255,255,0.55))'

/* ─────────────── Suivi des touches physiquement enfoncées ─────────────────── */

export type KeyToken = 'mod' | 'slash' | 'enter' | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

function normalizeKey(e: KeyboardEvent): KeyToken | null {
  if (e.key === 'Meta' || e.key === 'Control') return 'mod'
  if (e.key === 'Enter') return 'enter'
  if (e.key === '/' || e.code === 'Slash') return 'slash'
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    return e.key as KeyToken
  return null
}

/**
 * Ensemble des touches actuellement enfoncées (keydown → allumée, keyup → éteinte).
 * macOS ne délivre pas toujours les keyup des touches frappées pendant que ⌘ est
 * maintenu : on purge tout au relâchement du modificateur et à la perte de focus.
 */
function usePressedKeys(): Set<KeyToken> {
  const [pressed, setPressed] = useState<Set<KeyToken>>(() => new Set())

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = normalizeKey(e)
      if (!k) return
      setPressed(p => (p.has(k) ? p : new Set(p).add(k)))
    }
    const up = (e: KeyboardEvent) => {
      const k = normalizeKey(e)
      if (!k) return
      setPressed(p => {
        if (!p.has(k)) return p
        const n = new Set(p)
        n.delete(k)
        if (k === 'mod') n.clear()
        return n
      })
    }
    const clear = () => setPressed(new Set())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return pressed
}

/* ────────────────────────── Shell & atomes partagés ───────────────────────── */

function StepShell({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex h-full w-full antialiased" style={{ color: '#ffffffeb' }}>
      <motion.div
        variants={staggerParent}
        initial="initial"
        animate="animate"
        className="flex w-[40%] min-w-[380px] flex-col items-center justify-center px-10 text-center"
      >
        {left}
      </motion.div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden border-l border-white/5 bg-[#0e0e12]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        {right}
      </div>
    </div>
  )
}

function StepTitle({ children }: { children: ReactNode }) {
  return (
    <motion.h1
      variants={fadeUp}
      className="text-[36px] font-semibold leading-[1.15] tracking-tight"
      style={{
        background: TITLE_GRADIENT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {children}
    </motion.h1>
  )
}

function StepSub({ children }: { children: ReactNode }) {
  return (
    <motion.p variants={fadeUp} className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/55">
      {children}
    </motion.p>
  )
}

/** CTA réel de l'app (electron-login / ancien écran d'onboarding) — pas de bleu Cluely. */
function Cta({
  children,
  onClick,
  disabled,
  busy,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <motion.div variants={fadeUp} className="mt-10 flex w-full max-w-[300px] justify-center">
      <button
        onClick={onClick}
        disabled={disabled || busy}
        className="btn-apple-premium btn-hero-cta-premium app-region-no-drag group relative w-full px-10"
        style={{ opacity: disabled ? 0.5 : busy ? 0.92 : 1, cursor: disabled || busy ? 'default' : 'pointer' }}
      >
        <div className="btn-primary-shine" />
        <span className="relative z-10 flex items-center justify-center gap-1.5">
          {busy ? (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
              aria-label="Enregistrement en cours"
            />
          ) : (
            children
          )}
        </span>
      </button>
    </motion.div>
  )
}

/**
 * Lien "Passer" — masqué et non interactif à l'affichage de l'étape, apparaît
 * après un délai (2s, comme le hide-demo réel de Cluely) puis devient cliquable.
 * Présent sur chaque étape sautable (pas la 1ère, les permissions engagent l'app).
 */
function SkipLink({ onClick }: { onClick: () => void }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 2000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <motion.button
      onClick={ready ? onClick : undefined}
      aria-hidden={!ready}
      disabled={!ready}
      tabIndex={ready ? 0 : -1}
      initial={{ opacity: 0, y: -4 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="app-region-no-drag mt-4 text-[13px] text-white/40 transition-colors duration-200 hover:text-white/70"
    >
      Passer <span aria-hidden>›</span>
    </motion.button>
  )
}

/**
 * Keycap : sombre au repos, s'allume dans le bleu de marque UNIQUEMENT pendant
 * l'appui physique de la touche correspondante.
 */
function KeyCap({
  glyph,
  label,
  pressed,
  size = 'lg',
}: {
  glyph: ReactNode
  label?: string
  pressed?: boolean
  size?: 'lg' | 'sm'
}) {
  const lg = size === 'lg'
  return (
    <motion.div
      animate={pressed ? { scale: 0.92 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      className={[
        'flex select-none flex-col items-center justify-center',
        lg ? 'h-[72px] w-[72px] rounded-[16px]' : 'h-11 w-11 rounded-[12px]',
      ].join(' ')}
      style={{
        background: pressed ? BRAND_BLUE : KEY_IDLE_BG,
        boxShadow: pressed ? KEY_PRESSED_SHADOW : KEY_IDLE_SHADOW,
        color: pressed ? '#fff' : 'rgba(255,255,255,0.85)',
        transition: 'background 0.12s ease-out, box-shadow 0.12s ease-out, color 0.12s ease-out',
      }}
    >
      <span className={lg ? 'text-2xl leading-none' : 'text-sm leading-none'}>{glyph}</span>
      {label && <span className="mt-1 text-[10px] font-medium opacity-90">{label}</span>}
    </motion.div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300"
      style={{ background: on ? BRAND_ACCENT : 'rgba(255,255,255,0.15)' }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className={['h-4 w-4 rounded-full bg-white shadow', on ? 'ml-auto' : ''].join(' ')}
      />
    </div>
  )
}

/** Panneau "Ask" — même glass + hairline que electron-login, pas un mockup inventé. */
function AskPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-[440px] overflow-hidden rounded-2xl backdrop-blur-xl"
      style={{ background: ASK_PANEL_BG, border: ASK_PANEL_BORDER, boxShadow: ASK_PANEL_SHADOW }}
    >
      <div
        className="pointer-events-none absolute inset-x-3.5 top-0 z-10 h-px"
        style={{ background: ASK_PANEL_HAIRLINE }}
      />
      {children}
    </div>
  )
}

function AskBarMock() {
  return (
    <AskPanel>
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <span className="text-sm text-white/40">Demander n&apos;importe quoi…</span>
        <CornerDownLeft className="size-4 text-white/30" />
      </div>
      <div className="flex items-center justify-between border-t border-white/5 px-3.5 py-2">
        <img src="/claire_logo-removebg-preview.png" alt="" className="size-5 rounded-md opacity-80" />
        <div className="flex items-center gap-3 text-white/30">
          <Eye className="size-4" />
          <Mic className="size-4" />
          <span className="flex items-center gap-1 text-xs">
            Historique
            <span className="flex size-4 items-center justify-center rounded bg-white/10 text-[9px]">↓</span>
          </span>
        </div>
      </div>
    </AskPanel>
  )
}

/* ─────────────────────────── 1. Permissions (macOS) ───────────────────────── */

type Perms = { accessibility: boolean; microphone: boolean; screenRecording: boolean }

function useSystemPermissions(isMac: boolean) {
  const [perms, setPerms] = useState<Perms>({
    accessibility: !isMac,
    microphone: !isMac,
    screenRecording: !isMac,
  })

  const refresh = useCallback(async () => {
    const api = (window as any).api?.onboarding
    if (!api?.checkPermissions) {
      // Hors Electron (navigateur/QA) : pas de système à interroger, on n'entrave pas le flow.
      setPerms({ accessibility: true, microphone: true, screenRecording: true })
      return
    }
    try {
      const p = await api.checkPermissions()
      setPerms({
        accessibility: !!p?.accessibility,
        microphone: !!p?.microphone,
        screenRecording: !!p?.screenRecording,
      })
    } catch {
      /* démo hors Electron : on ne bloque pas */
    }
  }, [])

  useEffect(() => {
    if (!isMac) return
    void refresh()
    const id = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(id)
  }, [isMac, refresh])

  const request = useCallback(
    async (perm: 'accessibility' | 'microphone' | 'screen') => {
      const api = (window as any).api
      try {
        await api?.onboarding?.requestPermissions?.([perm])
      } catch {}
      await refresh()
      if (perm === 'screen') {
        // askForMediaAccess ne couvre pas l'écran : on ouvre le panneau Réglages Système.
        void api?.common?.openExternal?.(
          'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
        )
      }
    },
    [refresh]
  )

  return { perms, request }
}

function PermRow({
  icon,
  title,
  desc,
  on,
  onClick,
}: {
  icon: ReactNode
  title: string
  desc: string
  on: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className="app-region-no-drag flex w-full items-start gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 text-left transition-colors duration-200 hover:bg-white/[0.08]"
    >
      <span className="mt-0.5 text-white/55">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-white/90">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-white/40">{desc}</span>
      </span>
      <span className="mt-1">
        <Toggle on={on} />
      </span>
    </motion.button>
  )
}

export function PermissionsStep({ isMac, onNext }: StepProps) {
  const { perms, request } = useSystemPermissions(isMac)
  const accessibilityOk = !isMac || perms.accessibility

  return (
    <StepShell
      left={
        <>
          <StepTitle>Configurons Claire</StepTitle>
          <motion.div variants={fadeUp} className="mt-8 flex w-full max-w-[330px] flex-col gap-2.5">
            <PermRow
              icon={<Sparkles className="size-[18px]" />}
              title="Autoriser Claire à vous assister"
              desc="L'accessibilité permet les raccourcis globaux et les contrôles contextuels."
              on={perms.accessibility}
              onClick={() => void request('accessibility')}
            />
            <PermRow
              icon={<Mic className="size-[18px]" />}
              title="Autoriser Claire à entendre l'audio"
              desc="Claire écoute uniquement quand vous démarrez une session."
              on={perms.microphone}
              onClick={() => void request('microphone')}
            />
            <PermRow
              icon={<Monitor className="size-[18px]" />}
              title="Autoriser Claire à voir votre écran"
              desc="Claire répond à partir de ce que vous êtes en train de consulter."
              on={perms.screenRecording}
              onClick={() => void request('screen')}
            />
          </motion.div>
          <Cta onClick={() => (accessibilityOk ? onNext() : void request('accessibility'))}>
            {accessibilityOk ? 'Continuer' : "Autoriser l'accessibilité"}
          </Cta>
        </>
      }
      right={null}
    />
  )
}

/* ──────────────────────── 2. Réponse instantanée (⏎) ──────────────────────── */

export function AskStep({ onNext }: StepProps) {
  const pressed = usePressedKeys()
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // e.repeat : évite que le maintien de la touche relance l'anim en boucle
      // (auparavant perçu comme "ça ne fait que recharger").
      if (e.key === 'Enter' && !e.repeat) setRunId(i => i + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const bullets = [
    <>Ouvrez les Contrôles d&apos;effet et réglez la durée sur <b className="text-white/85">30 images</b></>,
    <>Choisissez l&apos;alignement <b className="text-white/85">Centré sur la coupe</b> pour lisser le raccord</>,
    <>Baissez les images clés audio d&apos;environ <b className="text-white/85">6 dB</b> sur la même plage</>,
  ]

  return (
    <StepShell
      left={
        <>
          <StepTitle>
            Appuyez sur{' '}
            <span className="mx-1 inline-flex translate-y-1.5">
              <KeyCap
                glyph={<CornerDownLeft className="size-4" />}
                size="sm"
                pressed={pressed.has('enter')}
              />
            </span>{' '}
            pour obtenir une réponse instantanée
          </StepTitle>
          <StepSub>
            Claire s&apos;appuie sur le contexte de votre écran pour répondre, sans avoir à écrire de
            prompt.
          </StepSub>
          <Cta onClick={onNext}>Suivant</Cta>
          <SkipLink onClick={onNext} />
        </>
      }
      right={
        <motion.div
          key={runId}
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } }}
        >
          <AskPanel>
            <div className="px-4 pb-2 pt-3.5 text-sm text-white/40">Demander n&apos;importe quoi…</div>
            <div className="border-t border-white/5 px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Eye className="size-3.5" />
                Écran consulté
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.4 } }}
                className="mt-2.5 text-[13px] leading-relaxed text-white/80"
              >
                Pour fluidifier le raccord entre vos deux plans, insérez un{' '}
                <b className="text-white/95">Fondu enchaîné</b> sur la piste{' '}
                <code className="rounded bg-white/10 px-1 text-xs">V1</code>.
              </motion.p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {bullets.map((b, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: { delay: 0.55 + i * 0.18, duration: 0.35, ease: EASE },
                    }}
                    className="flex gap-2 text-[13px] leading-relaxed text-white/60"
                  >
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-white/35" />
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 px-3.5 py-2 text-white/30">
              <img src="/claire_logo-removebg-preview.png" alt="" className="size-5 rounded-md opacity-80" />
              <span className="text-xs">Historique</span>
            </div>
          </AskPanel>
        </motion.div>
      }
    />
  )
}

/* ───────────────────────── 3. Masquer via raccourci ───────────────────────── */

export function HideStep({ isMac, onNext }: StepProps) {
  const pressed = usePressedKeys()
  const [done, setDone] = useState(false)
  const [hidden, setHidden] = useState(false)
  const advanced = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const mod = isMac ? e.metaKey : e.ctrlKey
      const isSlash = e.key === '/' || e.code === 'Slash'
      if (mod && isSlash) {
        e.preventDefault()
        if (advanced.current) return
        setDone(true)
        setHidden(true)
        window.setTimeout(() => setHidden(false), 550)
        window.setTimeout(() => {
          if (!advanced.current) {
            advanced.current = true
            onNext()
          }
        }, 1300)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMac, onNext])

  return (
    <StepShell
      left={
        <>
          <StepTitle>Masquez Claire avec ce raccourci</StepTitle>
          <StepSub>Affichez et masquez Claire à tout moment.</StepSub>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
            <KeyCap
              glyph={isMac ? '⌘' : 'Ctrl'}
              label={isMac ? 'command' : undefined}
              pressed={pressed.has('mod')}
            />
            <span className="text-xl text-white/40">+</span>
            <KeyCap glyph="/" pressed={pressed.has('slash')} />
          </motion.div>
          <Cta onClick={onNext} disabled={!done}>
            {done ? 'Raccourci détecté ✓' : 'Utilisez le raccourci pour continuer'}
          </Cta>
          <SkipLink onClick={onNext} />
        </>
      }
      right={
        <motion.div
          animate={hidden ? { opacity: 0, scale: 0.96, y: 8 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <AskBarMock />
        </motion.div>
      }
    />
  )
}

/* ─────────────────────────── 4. Déplacer la barre ─────────────────────────── */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function MoveStep({ isMac, onNext }: StepProps) {
  const pressed = usePressedKeys()
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      const delta: Record<string, [number, number]> = {
        ArrowUp: [0, -28],
        ArrowDown: [0, 28],
        ArrowLeft: [-28, 0],
        ArrowRight: [28, 0],
      }
      const d = delta[e.key]
      if (!d) return
      e.preventDefault()
      setOffset(o => ({ x: clamp(o.x + d[0], -110, 110), y: clamp(o.y + d[1], -80, 80) }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMac])

  return (
    <StepShell
      left={
        <>
          <StepTitle>Maintenant, déplacez Claire</StepTitle>
          <StepSub>Vous pouvez la déplacer dans n&apos;importe quelle direction.</StepSub>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
            <KeyCap
              glyph={isMac ? '⌘' : 'Ctrl'}
              label={isMac ? 'command' : undefined}
              pressed={pressed.has('mod')}
            />
            <span className="text-xl text-white/40">+</span>
            <div className="flex flex-col items-center gap-1.5">
              <KeyCap glyph="↑" size="sm" pressed={pressed.has('ArrowUp')} />
              <div className="flex gap-1.5">
                <KeyCap glyph="←" size="sm" pressed={pressed.has('ArrowLeft')} />
                <KeyCap glyph="↓" size="sm" pressed={pressed.has('ArrowDown')} />
                <KeyCap glyph="→" size="sm" pressed={pressed.has('ArrowRight')} />
              </div>
            </div>
          </motion.div>
          <Cta onClick={onNext}>Continuer</Cta>
          <SkipLink onClick={onNext} />
        </>
      }
      right={
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute bottom-10 left-1/2 top-10 w-px -translate-x-1/2 border-l border-dashed border-white/10" />
          <div className="absolute left-14 right-14 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-white/10" />
          <motion.div
            animate={{ x: offset.x, y: offset.y }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative z-10"
          >
            <AskBarMock />
          </motion.div>
        </div>
      }
    />
  )
}

/* ─────────────────────────── 5. Notes de réunion ──────────────────────────── */

export function NotesStep({ onNext }: StepProps) {
  return (
    <StepShell
      left={
        <>
          <StepTitle>Claire vient de rédiger vos notes</StepTitle>
          <StepSub>
            Actions à mener, relances et questions ouvertes sont enregistrées dans votre historique.
          </StepSub>
          <Cta onClick={onNext}>Continuer</Cta>
          <SkipLink onClick={onNext} />
        </>
      }
      right={
        <motion.div variants={staggerParent} initial="initial" animate="animate">
          <div
            className="w-[430px] rounded-2xl p-5"
            style={{
              background: 'rgba(20,20,25,0.95)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: ASK_PANEL_SHADOW,
            }}
          >
            <motion.h3 variants={fadeUp} className="text-lg font-semibold text-white/95">
              Synchro lancement Q3
            </motion.h3>
            <motion.div variants={fadeUp} className="mt-2 flex gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-white/55">
                <Calendar className="size-3" /> Aujourd&apos;hui, 12h30
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-white/55">
                <Users className="size-3" /> Léa + Marc
              </span>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-white/35"
            >
              RÉSUMÉ
            </motion.p>
            <motion.p variants={fadeUp} className="mt-1.5 text-sm font-medium text-white/85">
              Points clés
            </motion.p>
            <div className="mt-2 flex flex-col gap-1.5">
              {[
                <>Le <b className="text-white/85">lancement Q3</b> est verrouillé pour le 12 septembre ; la revue design pilote la passe visuelle.</>,
                <><b className="text-white/85">Léa</b> envoie un récap avec responsables et échéances avant vendredi.</>,
                <>Question ouverte : qui relit la version finale avant publication ?</>,
              ].map((line, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex gap-2 text-[13px] leading-relaxed text-white/60"
                >
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-white/35" />
                  <span>{line}</span>
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} className="mt-3.5 text-sm font-medium text-white/85">
              Décisions
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-1.5 h-6 bg-gradient-to-b from-white/25 to-transparent bg-clip-text text-[13px] text-transparent"
            >
              L&apos;équipe priorise la refonte du parcours d&apos;activation avant…
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-white/40"
            >
              <img src="/claire_logo-removebg-preview.png" alt="" className="size-5 rounded-md opacity-80" />
              <span className="flex items-center gap-1.5 text-xs">
                <FileText className="size-3.5" /> Voir la transcription
              </span>
            </motion.div>
          </div>
        </motion.div>
      }
    />
  )
}

/* ─────────────────────────── 6. Indétectabilité ───────────────────────────── */

export function InvisibleStep({ onNext }: StepProps) {
  return (
    <StepShell
      left={
        <>
          <StepTitle>Claire est totalement indétectable</StepTitle>
          <StepSub>
            Personne en visio ne peut voir Claire — ni dans les partages d&apos;écran, ni dans les
            enregistrements.
          </StepSub>
          <Cta onClick={onNext}>Continuer</Cta>
        </>
      }
      right={
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } }}
          className="relative"
        >
          <div className="rounded-[20px] p-1.5" style={{ border: `2px dashed ${BRAND_ACCENT}80` }}>
            <AskBarMock />
          </div>
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium text-white shadow"
            style={{ background: BRAND_BLUE }}
          >
            Invisible à l&apos;écran partagé
          </span>
        </motion.div>
      }
    />
  )
}

/* ─────────────────────────── 7. Paywall (vrais plans Claire) ──────────────── */

type Cycle = 'monthly' | 'annual'
type Plan = 'plus' | 'max'

const PLAN_PRICE_ENV: Record<Plan, Record<Cycle, string | undefined>> = {
  plus: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    annual: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
  },
  max: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID,
    annual: process.env.NEXT_PUBLIC_STRIPE_MAX_ANNUAL_PRICE_ID,
  },
}

// Prix réels configurés dans Stripe (confirmés ce jour côté dashboard) — pas les tarifs Cluely.
const PLAN_PRICE_DISPLAY: Record<Plan, Record<Cycle, number>> = {
  plus: { monthly: 20, annual: 100 },
  max: { monthly: 60, annual: 360 },
}

function PlanCard({
  plan,
  cycle,
  title,
  features,
  highlighted,
  loading,
  onSubscribe,
}: {
  plan: Plan
  cycle: Cycle
  title: string
  features: string[]
  highlighted?: boolean
  loading: boolean
  onSubscribe: () => void
}) {
  const price = PLAN_PRICE_DISPLAY[plan][cycle]
  const perMonth = cycle === 'annual' ? Math.round(price / 12) : price
  const fullPrice = cycle === 'annual' ? Math.round(price / 12 / 0.55) : Math.round(price / 0.55)

  return (
    <div
      className="flex w-[320px] flex-col rounded-2xl p-7"
      style={{
        background: highlighted
          ? 'linear-gradient(135deg, #3f7bff 0%, #0c26a8 100%)'
          : 'rgba(255,255,255,0.02)',
        border: highlighted ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.09)',
        boxShadow: highlighted ? '0 20px 60px rgba(21,98,223,0.35)' : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-white/95">{title}</span>
        {highlighted && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
            Populaire
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-base text-white/40 line-through">{fullPrice}€</span>
        <span className="text-4xl font-semibold text-white">{perMonth}€</span>
        <span className="text-sm text-white/60">/mois</span>
      </div>
      {cycle === 'annual' && (
        <span className="mt-0.5 text-[12px] text-white/50">{price}€ facturés une fois par an</span>
      )}
      <div className="mt-5 flex flex-col gap-2.5">
        {features.map(f => (
          <div key={f} className="flex items-start gap-2 text-[13px] leading-snug text-white/80">
            <Check className="mt-0.5 size-4 shrink-0 text-white/60" />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onSubscribe}
        disabled={loading}
        className="app-region-no-drag mt-6 flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-opacity"
        style={{
          background: highlighted ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
          color: highlighted ? '#0c26a8' : 'rgba(255,255,255,0.9)',
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            Choisir <span className="opacity-60">-45%</span>
          </>
        )}
      </button>
    </div>
  )
}

// Écran plein-largeur centré (pas le gabarit texte-gauche/démo-droite des autres
// étapes) — la vraie structure du paywall Cluely : titre centré, toggle centré,
// deux cartes larges côte à côte, ligne de confiance en bas.
export function PaywallStep({ onNext }: StepProps) {
  const [cycle, setCycle] = useState<Cycle>('annual')
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subscribe = useCallback(
    async (plan: Plan) => {
      const priceId = PLAN_PRICE_ENV[plan][cycle]
      if (!priceId) {
        setError('Configuration Stripe incomplète pour ce plan.')
        return
      }
      setError(null)
      setLoadingPlan(plan)
      try {
        const url = await startStripeCheckout(priceId, plan)
        window.location.href = url
      } catch (e: any) {
        setError(e?.message || 'Échec du paiement, réessayez.')
        setLoadingPlan(null)
      }
    },
    [cycle]
  )

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-10" style={{ color: '#ffffffeb', background: '#000' }}>
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="flex flex-col items-center">
        <motion.h1 variants={fadeUp} className="text-[32px] font-semibold tracking-tight text-white">
          Débloquez tout Claire
        </motion.h1>

        <motion.div
          variants={fadeUp}
          className="mt-6 flex items-center gap-1 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.94)' }}
        >
          {(['monthly', 'annual'] as Cycle[]).map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className="app-region-no-drag flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: cycle === c ? '#fff' : 'transparent',
                color: cycle === c ? '#0b0b0e' : 'rgba(11,11,14,0.5)',
                boxShadow: cycle === c ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {c === 'monthly' ? 'Mensuel' : 'Annuel'}
              {c === 'annual' && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: cycle === 'annual' ? '#e8f0ff' : 'rgba(11,11,14,0.08)',
                    color: cycle === 'annual' ? '#0c26a8' : 'rgba(11,11,14,0.45)',
                  }}
                >
                  -45%
                </span>
              )}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="mt-8 flex gap-5">
          <PlanCard
            plan="plus"
            cycle={cycle}
            title="Claire Plus"
            features={[
              'Réponses IA illimitées',
              'Sessions audio illimitées',
              'Accès aux derniers modèles',
              'Support prioritaire',
            ]}
            loading={loadingPlan === 'plus'}
            onSubscribe={() => void subscribe('plus')}
          />
          <PlanCard
            plan="max"
            cycle={cycle}
            title="Claire Max"
            highlighted
            features={[
              'Tout Claire Plus',
              'Usage étendu sans limite',
              'Modèles les plus avancés',
              'Support dédié',
            ]}
            loading={loadingPlan === 'max'}
            onSubscribe={() => void subscribe('max')}
          />
        </motion.div>

        {error && (
          <motion.p variants={fadeUp} className="mt-4 text-xs text-red-400">
            {error}
          </motion.p>
        )}

        <motion.div variants={fadeUp} className="mt-7 flex items-center gap-1.5 text-[13px] text-white/45">
          <span className="flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            ))}
          </span>
          Utilisé par des milliers de professionnels
        </motion.div>

        <motion.button
          variants={fadeUp}
          onClick={onNext}
          className="app-region-no-drag mt-4 text-[13px] text-white/40 transition-colors duration-200 hover:text-white/70"
        >
          Continuer sans payer
        </motion.button>
      </motion.div>
    </div>
  )
}
