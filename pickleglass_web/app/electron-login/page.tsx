'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useElectronRuntime } from '@/utils/electron'

function openLegal(url: string) {
  if (typeof window === 'undefined') return
  if (window.api?.common?.openExternal) {
    void window.api.common.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ElectronLoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const isElectronRuntime = useElectronRuntime()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isElectronRuntime === false) {
      router.replace('/auth/login')
    }
  }, [isElectronRuntime, router])

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace('/activity')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (isElectronRuntime !== true) return
    let cancelled = false

    const syncCurrentUser = async () => {
      try {
        const result = await window.api?.dashboard?.getUser?.()
        if (!cancelled && (result as { user?: unknown } | null)?.user) {
          router.replace('/activity')
        }
      } catch {
        // noop
      }
    }

    const handleUserChanged = (state: { isLoggedIn?: boolean }) => {
      if (!state?.isLoggedIn || cancelled) return
      router.replace('/activity')
    }

    void syncCurrentUser()
    window.api?.dashboard?.onUserChanged?.(handleUserChanged)

    return () => {
      cancelled = true
      window.api?.dashboard?.removeUserChanged?.()
    }
  }, [isElectronRuntime, router])

  const handleStart = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await window.api?.dashboard?.getUser?.()
      if ((res as { user?: unknown } | null)?.user) {
        router.replace('/activity')
        return
      }
      await window.api?.common?.startFirebaseAuth?.()
    } catch {
      // noop
    }
    setIsLoading(false)
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      fontFamily: '"Google Sans", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif',
      background: '#ffffff',
    }}>
      {/* ── Left Panel ── */}
      <div style={{
        flex: '50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem 2rem',
        position: 'relative',
        background: '#ffffff',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 420,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <Image
              src="/claire_logo-removebg-preview.png"
              alt="Claire Logo"
              width={56}
              height={56}
              priority
              style={{ width: 56, height: 56 }}
            />
            <span style={{
              fontSize: '1.4rem',
              fontWeight: 500,
              color: '#1d1d1f',
              letterSpacing: '-0.02em',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transform: 'translateY(-0.5px)',
              lineHeight: 1,
            }}>Claire</span>
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 500,
            textAlign: 'center',
            lineHeight: 1.25,
            letterSpacing: '-1.28px',
            margin: '0 0 12px',
            color: '#1d1d1f',
            whiteSpace: 'nowrap',
          }}>
            Bienvenue sur{' '}
            <span style={{ color: '#1d1d1f' }}>Claire</span>
          </h1>

          <p style={{
            fontSize: '1.25rem',
            fontWeight: 400,
            color: '#86868b',
            textAlign: 'center',
            lineHeight: 1.5,
            letterSpacing: '-0.01em',
            margin: '0 0 44px',
            whiteSpace: 'nowrap',
          }}>
            Votre assistant de réunion.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <button
              onClick={() => { void handleStart() }}
              disabled={isLoading}
              className="btn-apple-premium btn-hero-cta-premium px-10 group"
              style={{
                width: '100%',
                maxWidth: 320,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="btn-primary-shine" />
              <div className="blurred-border-black" />
              <span className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }} />
                ) : (
                  <>
                    <span style={{ fontFamily: 'inherit' }}>Continuer</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 400,
          textAlign: 'center',
          padding: '0 1rem',
        }}>
          <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: 1.6 }}>
            En vous inscrivant, vous acceptez nos{' '}
            <span
              onClick={() => openLegal('https://www.clairia.app/conditions')}
              style={{ fontWeight: 600, color: '#636366', cursor: 'pointer' }}
            >
              Conditions d&apos;utilisation
            </span>
            {' '}et notre{' '}
            <span
              onClick={() => openLegal('https://www.clairia.app/confidentialite')}
              style={{ fontWeight: 600, color: '#636366', cursor: 'pointer' }}
            >
              Politique de confidentialité
            </span>.
          </p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        flex: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '12%',
        position: 'relative',
        background: 'linear-gradient(160deg, #e8ebf0 0%, #dde1e8 100%)',
        borderLeft: '1px solid #e0e3e8',
        overflow: 'hidden',
        userSelect: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(21,98,223,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          top: '42%', left: '50%',
          transform: 'translateX(-50%)',
          width: '92%', maxWidth: 580,
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
          aspectRatio: '16/9',
        }}>
          <Image
            src="/zoom-mockup.jpg"
            alt=""
            fill
            sizes="50vw"
            style={{ objectFit: 'cover', objectPosition: 'center 75%', transform: 'scale(1.04) translateY(-4%)' }}
          />
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', width: '100%', padding: '0 16px', gap: 8,
          position: 'relative', zIndex: 1,
        }}>
          {/* Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            height: 42, padding: '0 6px 0 4px', borderRadius: 100,
            background: 'rgba(24,23,28,0.55)',
            border: '1px solid rgba(207,226,255,0.24)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            gap: 0, position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 12, right: 12, height: 1, borderRadius: 1, pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.18) 70%, transparent)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.90)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1.5"/><rect x="14" y="3" width="5" height="18" rx="1.5"/></svg>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2.5"/></svg>
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 14, marginLeft: 6, marginRight: 4 }}>
              {[0.35, 1, 0.6, 0.85, 0.4].map((s, i) => (
                <div key={i} style={{ width: 2.5, height: 14, borderRadius: 99, background: 'rgba(255,255,255,0.72)', transform: `scaleY(${s})`, transformOrigin: 'center' }} />
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.13)', margin: '0 4px', borderRadius: 1 }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px 0 8px', borderRadius: 100, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 500, margin: '0 2px', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.75 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              IA
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'rgba(255,255,255,0.90)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.13)', margin: '0 4px', borderRadius: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'rgba(255,255,255,0.90)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
          </div>

          {/* Ask panel mockup */}
          <div style={{
            width: '96%', maxWidth: 560,
            background: 'rgba(24,23,28,0.55)',
            border: '1px solid rgba(207,226,255,0.24)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 16, color: 'white',
            fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
            boxShadow: '0 24px 56px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, pointerEvents: 'none', zIndex: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13) 40%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.13) 60%, transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 16px 8px' }}>
              <div style={{ background: 'radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%)', color: '#CBE3FF', boxShadow: '0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff', borderRadius: '14px 14px 4px 14px', padding: '8px 13px', fontSize: 13, fontWeight: 500, maxWidth: '78%' }}>
                Claire peut-elle résumer ma réunion en direct ?
              </div>
            </div>
            <div style={{ padding: '8px 16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', margin: '0 0 10px' }}>
                Oui — Claire écoute votre réunion en temps réel et génère un{' '}
                <strong style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>résumé live</strong>{' '}
                avec les décisions, actions à suivre et points clés.
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
                Vous pouvez aussi poser des questions sur ce qui vient d&apos;être dit, demander une{' '}
                <strong style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>traduction</strong>{' '}
                ou obtenir une reformulation.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.28)', fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif', fontWeight: 400, userSelect: 'none' }}>
                Posez une question sur votre écran ou la conversation...
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '5px 7px', color: 'rgba(255,255,255,0.50)', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m1.636-6.364.707.707M6.343 17.657l-.707.707"/><circle cx="12" cy="12" r="4"/></svg>
              </div>
              <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: 'radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CBE3FF" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
