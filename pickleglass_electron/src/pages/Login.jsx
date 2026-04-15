import React, { useState } from 'react'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)

  // In Electron, auth is already handled by main process.
  // This screen is shown as a welcome/onboarding splash.
  const handleStart = async () => {
    setLoading(true)
    try {
      // Attempt to get user from main process (might already be logged in)
      const res = await window?.api?.dashboard?.getUser?.()
      if (res?.user) {
        onLogin(res.user)
        return
      }
      // If no user, open the web app login
      window.open('https://app.clairia.app/auth/login', '_blank')
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Left — branding */}
      <div className="flex flex-col items-center justify-center bg-white px-12 gap-0" style={{ flex: '0 0 44%' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-7">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          <span className="text-[19px] font-bold text-[#1d1d1f] tracking-tight">Claire</span>
        </div>

        <h1 className="text-[34px] font-bold text-[#1d1d1f] text-center leading-tight tracking-tight mb-3">
          Bienvenue sur Claire
        </h1>
        <p className="text-[14px] text-[#86868b] text-center leading-relaxed mb-9 max-w-[270px]">
          Votre assistant IA pour chaque réunion, en temps réel.
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full max-w-[320px] h-12 rounded-xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #4f8ef7 0%, #1a63e8 100%)',
            boxShadow: '0 4px 18px rgba(79,142,247,0.38)',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><span>Continuer</span><span className="text-[17px] font-light">›</span></>
          }
        </button>

        <p className="mt-10 text-[11px] text-[#b0b0b8] text-center leading-relaxed max-w-[300px]">
          En continuant, vous acceptez nos{' '}
          <span className="underline cursor-pointer hover:text-gray-500 transition-colors">Conditions d'utilisation</span>
          {' '}et notre{' '}
          <span className="underline cursor-pointer hover:text-gray-500 transition-colors">Politique de confidentialité</span>.
        </p>
      </div>

      {/* Right — demo visual */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #eef3ff 0%, #e4ecff 100%)' }}
      >
        {/* Background blobs */}
        <div className="absolute w-[380px] h-[380px] rounded-full -top-20 -right-20"
          style={{ background: 'rgba(79,142,247,0.10)' }} />
        <div className="absolute w-[280px] h-[280px] rounded-full -bottom-14 left-8"
          style={{ background: 'rgba(79,142,247,0.07)' }} />

        {/* Floating demo card */}
        <div
          className="relative z-10 rounded-[20px] p-6 w-[320px] shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
          }}
        >
          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">En écoute</span>
          </div>

          {/* Transcript excerpt */}
          <p className="text-[14px] text-[#1d1d1f] leading-relaxed mb-4">
            "Pour récapituler, nous avons besoin des nouvelles fonctionnalités d'ici vendredi…"
          </p>

          {/* AI suggestion */}
          <div
            className="rounded-xl p-3.5"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #1a63e8 100%)' }}
          >
            <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider mb-1">Suggestion de Claire</p>
            <p className="text-[13px] text-white font-medium leading-snug">
              Proposer un point d'étape pour jeudi ?
            </p>
          </div>

          {/* Action chips */}
          <div className="flex gap-2 mt-3">
            {['Résumé', 'Suivant', 'Email'].map(label => (
              <span key={label} className="px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-500 bg-neutral-100">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
