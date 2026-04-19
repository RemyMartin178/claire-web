import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import zoomMockup from '../assets/zoom-mockup.jpg'
import { getUser, startExternalAuth, openExternal, onUserChanged, removeUserChanged } from '../utils/api.js'

const brandCircle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  display: 'grid',
  placeItems: 'center',
  background: 'radial-gradient(circle at 30% 20%, #2b76ff 0%, #0d3aa9 70%, #081c5c 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 14px 32px rgba(13,58,169,0.28)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: '-0.04em',
}

function openLegal(url) {
  if (openExternal) {
    openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// authState: 'idle' | 'loading' | 'waitingDeepLink' | 'success'
export default function Login({ onLogin }) {
  const [authState, setAuthState] = useState('idle')

  useEffect(() => {
    if (authState !== 'waitingDeepLink') return
    const handler = (_e, state) => {
      if (state?.isLoggedIn) {
        setAuthState('success')
        setTimeout(() => onLogin?.({ uid: state.uid, email: state.email, displayName: state.displayName }), 600)
      }
    }
    onUserChanged(handler)
    return () => removeUserChanged(handler)
  }, [authState, onLogin])

  const handleContinue = async () => {
    if (authState !== 'idle') return
    setAuthState('loading')
    try {
      const res = await getUser()
      if (res?.user) {
        setAuthState('success')
        setTimeout(() => onLogin?.(res.user), 600)
        return
      }
      await startExternalAuth()
      setAuthState('waitingDeepLink')
    } catch (error) {
      console.error(error)
      setAuthState('idle')
    }
  }

  const loading = authState === 'loading'
  const waiting = authState === 'waitingDeepLink'
  const success = authState === 'success'
  const busy = loading || waiting || success

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#1d1d1f]">
      <section className="relative flex w-[45%] min-w-[420px] flex-col justify-center px-10 py-10">
        <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
          <div className="mb-7 flex items-center gap-3">
            <div style={brandCircle}>C</div>
            <span className="text-[1.25rem] font-medium tracking-[-0.03em]">Claire</span>
          </div>

          <h1 className="mb-3 text-center text-[2.65rem] font-medium leading-[1.08] tracking-[-0.06em]">
            Ouvrir Claire sur le web
          </h1>

          <p className="mb-8 text-center text-[1rem] leading-7 text-[#6e6e73]">
            Cette fenetre Electron ne gere pas l'authentification. Elle sert seulement de passerelle vers le flow web principal.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full"
          >
            <button
              onClick={handleContinue}
              disabled={busy}
              className="btn-apple-premium btn-hero-cta-premium group w-full px-8"
              style={{ opacity: busy ? 0.72 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              <div className="btn-primary-shine" />
              <div className="blurred-border-black" />
              <span className="relative z-10 flex items-center justify-center">
                {success ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (loading || waiting) ? (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                ) : (
                  <>
                    <span>Continuer sur le web</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
            {waiting && (
              <p className="mt-3 text-center text-[12px] text-[#6e6e73]">
                Connectez-vous dans le navigateur, puis revenez ici.
              </p>
            )}
          </motion.div>

          <p className="mt-8 text-center text-[12px] leading-6 text-[#a1a1aa]">
            Le login et l'inscription s'ouvrent uniquement dans votre navigateur sur `pickleglass_web`.
            <br />
            <span
              onClick={() => openLegal('https://www.clairia.app/conditions')}
              className="cursor-pointer font-semibold text-[#636366]"
            >
              Conditions d&apos;utilisation
            </span>
            {' '}et{' '}
            <span
              onClick={() => openLegal('https://www.clairia.app/confidentialite')}
              className="cursor-pointer font-semibold text-[#636366]"
            >
              Politique de confidentialite
            </span>
            .
          </p>
        </div>
      </section>

      <section
        className="relative flex flex-1 items-start justify-center overflow-hidden border-l border-[#e5e7eb] px-5 pt-[9%]"
        style={{ background: 'linear-gradient(160deg, #edf1f6 0%, #e3e8f0 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.035) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="pointer-events-none absolute right-[-70px] top-[-70px] h-[280px] w-[280px]"
          style={{ background: 'radial-gradient(circle, rgba(21,98,223,0.12) 0%, transparent 72%)' }}
        />

        <div className="relative z-10 flex w-full max-w-[560px] flex-col items-center gap-7">
          <div className="inline-flex h-[40px] items-center rounded-full border border-white/15 bg-[rgba(24,23,28,0.56)] px-4 text-[12px] font-medium text-white/85 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-[14px]">
            Le renderer Electron reste separe du flow d'auth web.
          </div>

          <div className="w-full overflow-hidden rounded-[18px] border border-[rgba(207,226,255,0.24)] bg-[rgba(24,23,28,0.56)] text-white shadow-[0_24px_56px_rgba(0,0,0,0.22)] backdrop-blur-[18px]">
            <div className="border-b border-white/8 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              </div>
              <div className="rounded-[14px] bg-[radial-gradient(179.05%_132.83%_at_46.18%_-23.44%,_#1562df_0,_#0c26a8_100%)] px-4 py-3 text-[13px] font-medium text-[#dbeafe] shadow-[0_0_0_.678px_#0c44a1,inset_0_-1.355px_#022c70,inset_0_.678px_#81b6ff]">
                Claire peut vous assister pendant la reunion, mais le compte se connecte sur le web principal.
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              <p className="text-[13.5px] leading-6 text-white/78">
                Le renderer Electron affiche seulement l'interface desktop et n'embarque aucune page login ou register.
              </p>
              <p className="text-[13.5px] leading-6 text-white/78">
                Quand vous continuez, le navigateur ouvre le flow externe puis revient via le deeplink de l'application.
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-white/8 px-5 py-4">
              <span className="flex-1 text-[12.5px] text-white/30">
                Desktop d'un cote, authentification web de l'autre.
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(179.05%_132.83%_at_46.18%_-23.44%,_#1562df_0,_#0c26a8_100%)] shadow-[0_0_0_.678px_#0c44a1,inset_0_-1.355px_#022c70,inset_0_.678px_#81b6ff]">
                <ArrowRight className="h-4 w-4 text-[#dbeafe]" />
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[560px] overflow-hidden rounded-[18px] shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <img
              src={zoomMockup}
              alt=""
              className="pointer-events-none h-[220px] w-full object-cover"
              style={{ objectPosition: 'center 74%' }}
            />
          </div>
        </div>
      </section>

      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}
