import React from 'react'

const brandCircle = {
  width: 44,
  height: 44,
  borderRadius: 13,
  background: 'radial-gradient(circle at 30% 20%, #2b76ff 0%, #0d3aa9 70%, #081c5c 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px rgba(13,58,169,0.32)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 17,
  letterSpacing: '-0.04em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const spinnerRing = {
  width: 20,
  height: 20,
  border: '2px solid rgba(13,58,169,0.15)',
  borderTopColor: '#1562df',
  borderRadius: '50%',
  animation: 'loader-spin 0.75s linear infinite',
}

export default function Loader({ label = 'Chargement…' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#eef1f4',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        background: '#fff',
        borderRadius: 18,
        padding: '32px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
        border: '1px solid rgba(0,0,0,0.06)',
        minWidth: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={brandCircle}>C</div>
          <span style={{ fontSize: '1.05rem', fontWeight: 500, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Claire</span>
        </div>
        <div style={spinnerRing} />
        <span style={{ fontSize: 12, color: '#8e8e93', letterSpacing: '-0.01em' }}>{label}</span>
      </div>
      <style>{`@keyframes loader-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
