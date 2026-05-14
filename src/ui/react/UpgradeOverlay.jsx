import React, { useEffect, useRef } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id; s.textContent = css;
    document.head.appendChild(s);
  }
};

const CSS = `
@keyframes uo-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes uo-card-in {
  0%   { opacity: 0; transform: translateY(16px) scale(0.94); }
  70%  { transform: translateY(-3px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes uo-badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(120,80,255,0.5); }
  50%       { box-shadow: 0 0 0 6px rgba(120,80,255,0); }
}

.uo-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: uo-backdrop-in 0.22s ease both;
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
}

.uo-card {
  position: relative;
  width: 380px;
  background: rgba(14,13,20,0.96);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px;
  padding: 36px 32px 32px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset;
  animation: uo-card-in 0.32s cubic-bezier(0.34,1.3,0.64,1) both;
  text-align: center;
}

.uo-close {
  position: absolute; top: 14px; right: 14px;
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 400;
  transition: background 0.15s, color 0.15s;
  line-height: 1;
}
.uo-close:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.80); }

.uo-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, rgba(100,60,220,0.25) 0%, rgba(60,80,255,0.18) 100%);
  border: 1px solid rgba(140,100,255,0.35);
  border-radius: 20px; padding: 5px 13px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: rgba(180,150,255,0.95);
  margin-bottom: 20px;
  animation: uo-badge-pulse 2.5s ease-in-out infinite;
}

.uo-icon {
  width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 18px;
  background: linear-gradient(145deg, rgba(80,50,200,0.35) 0%, rgba(30,40,180,0.25) 100%);
  border: 1px solid rgba(120,90,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}

.uo-title {
  font-size: 20px; font-weight: 700; letter-spacing: -0.02em;
  color: rgba(255,255,255,0.95); margin: 0 0 10px;
  line-height: 1.25;
}

.uo-desc {
  font-size: 13.5px; line-height: 1.6;
  color: rgba(255,255,255,0.50);
  margin: 0 0 24px;
}

.uo-features {
  list-style: none; padding: 0; margin: 0 0 28px; text-align: left;
}
.uo-features li {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.70);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.uo-features li:last-child { border-bottom: none; }
.uo-check {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
  background: linear-gradient(135deg, #7050d8, #3040e0);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: #fff; font-weight: 700;
}

.uo-cta {
  display: block; width: 100%;
  background: linear-gradient(135deg, #6030d0 0%, #2030c0 100%);
  border: 1px solid rgba(120,80,255,0.40);
  box-shadow: 0 0 0 1px rgba(80,50,200,0.30), 0 4px 20px rgba(60,30,180,0.40), inset 0 1px rgba(200,170,255,0.15);
  border-radius: 12px; padding: 13px 20px;
  font-size: 14px; font-weight: 600; color: #fff; cursor: pointer;
  transition: filter 0.15s, transform 0.10s;
  font-family: inherit;
  margin-bottom: 10px;
}
.uo-cta:hover { filter: brightness(1.12); transform: translateY(-1px); }
.uo-cta:active { transform: scale(0.98); }

.uo-hint {
  font-size: 11px; color: rgba(255,255,255,0.28);
}
`;

export default function UpgradeOverlay({ onClose }) {
  injectStyles('upgrade-overlay-styles', CSS);
  const cardRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
  };

  const handleUpgrade = () => {
    window.api?.openExternal?.('https://clairia.app/settings/billing');
    onClose();
  };

  return (
    <div className="uo-backdrop" onClick={handleBackdropClick}>
      <div className="uo-card" ref={cardRef}>
        <button className="uo-close" onClick={onClose} aria-label="Fermer">✕</button>

        <div className="uo-badge">
          <span>✦</span> Claire Max
        </div>

        <div className="uo-icon">🛡️</div>

        <h2 className="uo-title">Protection de contenu</h2>
        <p className="uo-desc">
          Rendez Claire invisible lors des partages d'écran et des enregistrements.
          Disponible avec le plan Max.
        </p>

        <ul className="uo-features">
          <li>
            <span className="uo-check">✓</span>
            <span>Invisible en partage d'écran et capture vidéo</span>
          </li>
          <li>
            <span className="uo-check">✓</span>
            <span>Réponses IA et prises de notes illimitées</span>
          </li>
          <li>
            <span className="uo-check">✓</span>
            <span>Accès prioritaire aux derniers modèles IA</span>
          </li>
          <li>
            <span className="uo-check">✓</span>
            <span>Support dédié</span>
          </li>
        </ul>

        <button className="uo-cta" onClick={handleUpgrade}>
          Passer à Max — 60€/mois
        </button>
        <p className="uo-hint">Ou 360€/an · Annulable à tout moment</p>
      </div>
    </div>
  );
}
