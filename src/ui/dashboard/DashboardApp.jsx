import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

// ── Splash / Login screen (shown before web app loads) ────────
function SplashScreen() {
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    await window.api.dashboard.setLaunched()
    await window.api.dashboard.loadWebApp()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>

      {/* Left panel — branding */}
      <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '48px', gap: '0' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.02em' }}>Claire</span>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1d1d1f', textAlign: 'center', letterSpacing: '-0.03em', lineHeight: '1.15', marginBottom: '12px' }}>
          Bienvenue sur Claire
        </h1>
        <p style={{ fontSize: '15px', color: '#86868b', textAlign: 'center', lineHeight: '1.5', marginBottom: '36px', maxWidth: '280px' }}>
          Votre assistant IA pour chaque réunion, en temps réel.
        </p>

        {/* CTA button */}
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            width: '100%', maxWidth: '320px', height: '48px',
            background: loading ? '#86a8e7' : 'linear-gradient(135deg, #4f8ef7 0%, #1a63e8 100%)',
            border: 'none', borderRadius: '12px',
            color: '#fff', fontSize: '16px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'opacity 0.15s',
            boxShadow: '0 4px 16px rgba(79,142,247,0.35)',
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {loading ? (
            <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'splash-spin 0.7s linear infinite' }} />
          ) : (
            <>Commencer <span style={{ fontSize: '18px' }}>›</span></>
          )}
        </button>

        {/* Footer */}
        <p style={{ marginTop: '40px', fontSize: '12px', color: '#b0b0b8', textAlign: 'center' }}>
          En continuant, vous acceptez nos{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Conditions d'utilisation</span>
          {' '}et notre{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Politique de confidentialité</span>.
        </p>
      </div>

      {/* Right panel — demo visual */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, #f0f4ff 0%, #e8eeff 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(79,142,247,0.1)', top: '-80px', right: '-80px' }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(79,142,247,0.08)', bottom: '-60px', left: '20px' }} />

        {/* Floating card mock */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          borderRadius: '20px', padding: '24px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset',
          border: '1px solid rgba(255,255,255,0.9)',
          width: '340px', position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>En écoute</span>
          </div>
          <div style={{ fontSize: '15px', color: '#1d1d1f', lineHeight: '1.6', marginBottom: '16px' }}>
            "Pour récapituler, nous avons besoin des nouvelles fonctionnalités d'ici vendredi..."
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4f8ef7, #1a63e8)', borderRadius: '10px', padding: '12px 16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontWeight: '500' }}>Suggestion de Claire</p>
            <p style={{ fontSize: '13px', color: '#fff', fontWeight: '500' }}>Proposez un point d'étape pour jeudi ?</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes splash-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── App entry point ───────────────────────────────────────────
function DashboardApp() {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const { firstLaunch } = await window.api.dashboard.isFirstLaunch()
        if (!firstLaunch) {
          // Already launched before → load web app immediately
          await window.api.dashboard.loadWebApp()
          // Keep checking=true so we show a blank white screen while loading
        } else {
          setChecking(false) // Show splash
        }
      } catch (_) {
        setChecking(false) // Fallback: show splash
      }
    }
    check()
  }, [])

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid #e5e7eb', borderTop: '2px solid #9ca3af', borderRadius: '50%', animation: 'splash-spin 0.7s linear infinite' }} />
        <style>{`@keyframes splash-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <SplashScreen />
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<DashboardApp />)
