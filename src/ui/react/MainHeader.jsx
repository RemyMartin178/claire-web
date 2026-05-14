import React, { useState, useEffect, useRef, useCallback } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }
};

const CSS = `
* { box-sizing: border-box; }

.mh-root {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.mh-root * {
  font-family: inherit;
  user-select: none;
  cursor: default;
}
.mh-root.hiding { animation: mh-up 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; }
.mh-root.showing { animation: mh-down 0.38s cubic-bezier(0.34, 1.3, 0.64, 1) forwards; }
.mh-root.sliding-in { animation: mh-fadein 0.25s ease-out forwards; }
.mh-root.hidden { opacity: 0; transform: translateY(-160%) scale(0.82); pointer-events: none; }

@keyframes mh-up {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-160%) scale(0.82); }
}
@keyframes mh-down {
  0%   { opacity: 0; transform: translateY(-160%) scale(0.82); }
  60%  { opacity: 1; transform: translateY(4px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes mh-fadein {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* In overlay mode the whole window must NOT move — pill uses JS drag only */
.mh-root.overlay-mode .mh-pill,
.mh-root.overlay-mode .mh-login-pill {
  -webkit-app-region: no-drag;
}

/* ── PILL ── */
.mh-pill {
  -webkit-app-region: drag;
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 9px;
  border-radius: 100px;
  background: hsla(252,10%,10%,0.82);
  border: 0.5px solid rgba(255,255,255,0.09);
  box-shadow: 0 2px 12px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.04) inset;
  gap: 6px;
  position: relative;
  overflow: visible;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

.mh-pill .mh-wide-btn { order: 1; }
.mh-pill .mh-listen-section { order: 2; }
.mh-pill .mh-btn,
.mh-pill .mh-divider,
.mh-pill .mh-rec-wave,
.mh-pill .mh-shortcut {
  display: none !important;
}
.mh-pill .mh-listen-controls > button:first-child {
  display: none !important;
}

/* subtle top gloss */
.mh-pill::before {
  content: '';
  position: absolute;
  top: 0; left: 12px; right: 12px;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.14) 30%,
    rgba(255,255,255,0.18) 50%,
    rgba(255,255,255,0.14) 70%,
    transparent 100%
  );
  border-radius: 1px;
  pointer-events: none;
}

/* ── DIVIDER ── */
.mh-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.14);
  margin: 0 1px;
  flex-shrink: 0;
  border-radius: 1px;
}

/* ── POST LOGIN ANIMATION ── */
@keyframes mh-pill-reveal {
  0% { max-width: 190px; opacity: 0.5; }
  100% { max-width: 650px; opacity: 1; }
}
@keyframes mh-item-slide {
  0% { opacity: 0; transform: translateX(-15px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}

.mh-pill.animating-in {
  animation: mh-pill-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  white-space: nowrap;
}
.mh-pill.animating-in > * {
  opacity: 0;
  animation: mh-item-slide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.mh-pill.animating-in > *:nth-child(1) { animation-delay: 0.05s; }
.mh-pill.animating-in > *:nth-child(2) { animation-delay: 0.10s; }
.mh-pill.animating-in > *:nth-child(3) { animation-delay: 0.15s; }
.mh-pill.animating-in > *:nth-child(4) { animation-delay: 0.20s; }
.mh-pill.animating-in > *:nth-child(5) { animation-delay: 0.25s; }
.mh-pill.animating-in > *:nth-child(6) { animation-delay: 0.30s; }
.mh-pill.animating-in > *:nth-child(7) { animation-delay: 0.35s; }
.mh-pill.animating-in > *:nth-child(8) { animation-delay: 0.40s; }

/* ── ICON BUTTONS ── */
.mh-btn {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 0;
  background: rgba(255,255,255,0.07);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: background 0.15s ease, color 0.12s ease, transform 0.12s ease;
  flex-shrink: 0;
  position: relative;
}
.mh-btn:hover {
  background: rgba(255,255,255,0.14);
  color: rgba(255, 255, 255, 0.95);
}
.mh-btn:active { transform: scale(0.92); }
.mh-btn.active {
  background: rgba(255,255,255,0.12);
  color: rgba(255, 255, 255, 0.95);
}
.mh-btn.accent { color: rgba(99, 179, 237, 0.9); }
.mh-btn.accent:hover { color: rgba(144, 205, 244, 1); }
.mh-btn svg { display: block; }

/* ── WIDE BUTTON (Hide) ── */
.mh-wide-btn {
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 11px;
  border-radius: 100px;
  border: none;
  background: rgba(255,255,255,0.10);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.12s ease, transform 0.12s ease;
  white-space: nowrap;
  flex-shrink: 0;
  margin: 0;
}
.mh-wide-btn:hover {
  background: rgba(255,255,255,0.16);
  color: rgba(255,255,255,0.95);
}
.mh-wide-btn:active { transform: scale(0.94); }
.mh-wide-btn svg { opacity: 0.86; }

/* ── LISTEN SECTION ── */
.mh-listen-section {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  padding: 0;
}

/* ── STATUS DOT ── */
.mh-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(74, 222, 128, 0.9);
  animation: mh-pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes mh-pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
.mh-status-dot.recording {
  background: rgba(248, 113, 113, 0.9);
}

/* ── RECORDING WAVEFORM ── */
.mh-rec-wave {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 14px;
  flex-shrink: 0;
}
.mh-rec-wave span {
  display: block;
  width: 2.5px;
  height: 14px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.72);
  transform-origin: center;
  animation: mh-wave-bar 1.6s ease-in-out infinite;
  transition: transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.6s cubic-bezier(0.4,0,0.2,1);
}
.mh-rec-wave span:nth-child(1) { animation-delay: 0s; }
.mh-rec-wave span:nth-child(2) { animation-delay: 0.32s; }
.mh-rec-wave span:nth-child(3) { animation-delay: 0.16s; }
.mh-rec-wave.paused span {
  animation: mh-wave-settle 0.7s cubic-bezier(0.4,0,0.2,1) forwards;
  opacity: 0.28;
}
@keyframes mh-wave-settle {
  0%   { transform: scaleY(var(--bar-scale, 0.55)); }
  60%  { transform: scaleY(0.18); }
  100% { transform: scaleY(0.12); }
}
@keyframes mh-wave-bar {
  0%, 100% { transform: scaleY(0.28); opacity: 0.45; }
  50% { transform: scaleY(1); opacity: 0.80; }
}

/* ── SHORTCUT BADGE ── */
.mh-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 3px;
}
.mh-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 3px;
  background: rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 3px;
  font-size: 9px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.02em;
}

/* ── LISTEN CONTROLS ── */
@keyframes mh-spin { to { transform: rotate(360deg); } }
.mh-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: rgba(255,255,255,0.8);
  border-radius: 50%;
  animation: mh-spin 0.7s linear infinite;
}

.mh-ctrl {
  -webkit-app-region: no-drag;
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  color: rgba(255,255,255,0.90);
  cursor: pointer;
  flex-shrink: 0;
  transition: filter 0.15s ease, transform 0.12s ease, color 0.12s ease;
}
.mh-ctrl:hover { filter: brightness(1.25); color: #fff; }
.mh-ctrl:active { transform: scale(0.92); }
.mh-ctrl:disabled { opacity: 0.35; cursor: default; pointer-events: none; }
.mh-ctrl.stop { color: rgba(255,255,255,0.78); }
.mh-ctrl.stop:hover { color: #fecaca; }
.mh-listen-controls { display: flex; align-items: center; gap: 5px; }
@keyframes ctrl-pop {
  0%   { opacity: 0; transform: scale(0.55); }
  70%  { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ctrl-pop2 {
  0%   { opacity: 0; transform: scale(0.55); }
  70%  { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
.mh-ctrl-pop  { animation: ctrl-pop  0.22s cubic-bezier(0.34,1.4,0.64,1) both; }
.mh-ctrl-pop2 { animation: ctrl-pop2 0.22s cubic-bezier(0.34,1.4,0.64,1) 0.05s both; }

/* ── LOGIN PILL ── */
.mh-login-pill {
  -webkit-app-region: drag;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0;
  border-radius: 100px;
  gap: 8px;
  background: transparent;
  border: 0;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
}
.mh-sign-in-btn {
  -webkit-app-region: no-drag;
  height: 32px;
  padding: 0 14px;
  border-radius: 100px;
  border: 0;
  background: linear-gradient(#0544a9,#022c70);
  box-shadow: 0 0 0 0.5px #0c44a1, 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #022c70, inset 0 0.5px #81b6ff;
  color: rgba(255,255,255,0.88);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease;
  letter-spacing: 0.01em;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  min-width: 120px;
}
.mh-sign-in-btn:hover { filter: brightness(1.18); }
.mh-sign-in-btn:disabled { opacity: 0.5; cursor: default; }

/* ── QUIT BUTTON (sibling to pill, detached) ── */
.mh-quit-btn {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  margin-left: 8px;
  transition: background 0.12s ease, color 0.12s ease;
}
.mh-quit-btn:hover { filter: brightness(1.18); color: rgba(255,255,255,0.95); }

`;

const KEY_MAP = {
  'Cmd':'⌘','Command':'⌘','Ctrl':'⌃','Control':'⌃',
  'Alt':'⌥','Option':'⌥','Shift':'⇧','Enter':'↵',
  'Backspace':'⌫','Tab':'⇥','Escape':'⎋',
  'Up':'↑','Down':'↓','Left':'←','Right':'→',
};

function ShortcutBadge({ accelerator }) {
  if (!accelerator) return null;
  return (
    <span className="mh-shortcut">
      {accelerator.split('+').map((k, i) => (
        <span key={i} className="mh-key">{KEY_MAP[k] || k}</span>
      ))}
    </span>
  );
}

/* ── ICONS ── */
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconAsk = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconScreen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);
const IconClear = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconAgents = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    <line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconMic = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IconPause = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="3" width="5" height="18" rx="1.5"/>
    <rect x="14" y="3" width="5" height="18" rx="1.5"/>
  </svg>
);
const IconPlay = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3l14 9-14 9V3z"/>
  </svg>
);
const IconStop = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2.5"/>
  </svg>
);

export default function MainHeader({
  overlayMode = false,
  overlayPosX = 0,
  overlayPosY = 0,
  onOverlayPosChange = null,
  onOverlayDragEnd = null,
  onOverlayDragStart = null,
} = {}) {
  const [isTogglingSession, setIsTogglingSession] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shortcuts, setShortcuts] = useState({});
  const [listenSessionStatus, setListenSessionStatus] = useState('beforeSession');
  const [hasPersistentArea, setHasPersistentArea] = useState(false);
  const [askScreenContext, setAskScreenContext] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(localStorage.getItem('claire_tts_enabled') === 'true');
  const [agentModeActive, setAgentModeActive] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [animClass, setAnimClass] = useState('sliding-in');
  const waveBar0 = useRef(null);
  const waveBar1 = useRef(null);
  const waveBar2 = useRef(null);
  const waveBarRefs = [waveBar0, waveBar1, waveBar2];

  const hostRef = useRef(null);
  const wasJustDraggedRef = useRef(false);
  const dragStateRef = useRef(null);
  const lastSettingsToggleRef = useRef(0);
  // Overlay mode: keep refs in sync with props for drag start position
  const overlayPosXRef = useRef(overlayPosX);
  const overlayPosYRef = useRef(overlayPosY);
  const onOverlayPosChangeRef = useRef(onOverlayPosChange);
  const onOverlayDragEndRef = useRef(onOverlayDragEnd);
  const onOverlayDragStartRef = useRef(onOverlayDragStart);
  useEffect(() => { overlayPosXRef.current = overlayPosX; }, [overlayPosX]);
  useEffect(() => { overlayPosYRef.current = overlayPosY; }, [overlayPosY]);
  useEffect(() => { onOverlayPosChangeRef.current = onOverlayPosChange; }, [onOverlayPosChange]);
  useEffect(() => { onOverlayDragEndRef.current = onOverlayDragEnd; }, [onOverlayDragEnd]);
  useEffect(() => { onOverlayDragStartRef.current = onOverlayDragStart; }, [onOverlayDragStart]);
  const listenStatusRef = useRef('beforeSession');
  const agentModeRef = useRef(false);

  // Animation post-login state
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const prevIsUserLoggedIn = useRef(isUserLoggedIn);
  useEffect(() => {
    if (!prevIsUserLoggedIn.current && isUserLoggedIn) {
      setJustLoggedIn(true);
      const t = setTimeout(() => setJustLoggedIn(false), 1000);
      return () => clearTimeout(t);
    }
    prevIsUserLoggedIn.current = isUserLoggedIn;
  }, [isUserLoggedIn]);

  injectStyles('mh-styles-v2', CSS);

  useEffect(() => { listenStatusRef.current = listenSessionStatus; }, [listenSessionStatus]);
  useEffect(() => { agentModeRef.current = agentModeActive; }, [agentModeActive]);

  const setAgentMode = useCallback((active) => {
    const api = window.api;
    if (api?.sharedState?.patch) {
      void api.sharedState.patch({ agentMode: Boolean(active) });
      return;
    }
    void api?.mainHeader?.setAgentMode?.(Boolean(active));
  }, []);

  // ── Audio level → waveform bars ────────────────────────
  useEffect(() => {
    const HEIGHTS = [0.28, 0.28, 0.28]; // resting scale per bar
    const PHASES  = [0, 0.32, 0.16];    // animation phase offsets (seconds)
    let animFrameId = null;

    const handleAudioLevel = (e) => {
      const rms = e.detail?.rms ?? 0;
      // Map RMS (0–0.15 typical) to a 0–1 range and boost it visually
      const level = Math.min(1, rms / 0.08);
      const now = performance.now() / 1000;

      waveBarRefs.forEach((ref, i) => {
        if (!ref.current) return;
        // Add a slow sine wobble + the live audio level
        const wobble = Math.sin((now + PHASES[i]) * 2.5) * 0.2;
        const scale = HEIGHTS[i] + level * 0.72 + Math.max(0, wobble) * level;
        ref.current.style.transform = `scaleY(${Math.max(0.12, Math.min(1, scale))})`;
        ref.current.style.opacity = (0.35 + level * 0.55).toFixed(2);
      });
    };

    window.addEventListener('audio-level', handleAudioLevel);
    return () => {
      window.removeEventListener('audio-level', handleAudioLevel);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, []);

  // ── Drag ──────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!dragStateRef.current) return;
    const dx = Math.abs(e.screenX - dragStateRef.current.iMouseX);
    const dy = Math.abs(e.screenY - dragStateRef.current.iMouseY);
    if (dx > 4 || dy > 4) dragStateRef.current.moved = true;
    if (dragStateRef.current.rafId) cancelAnimationFrame(dragStateRef.current.rafId);
    dragStateRef.current.rafId = requestAnimationFrame(() => {
      if (!dragStateRef.current) return;
      const nx = dragStateRef.current.iWinX + (e.screenX - dragStateRef.current.iMouseX);
      const ny = dragStateRef.current.iWinY + (e.screenY - dragStateRef.current.iMouseY);
      const cx = nx;
      const cy = ny;
      if (cx !== dragStateRef.current.lastX || cy !== dragStateRef.current.lastY) {
        if (onOverlayPosChangeRef.current) {
          // Overlay mode: pure React state update — zero IPC, zero OS window calls
          onOverlayPosChangeRef.current(cx, cy);
        } else {
          window.api?.mainHeader?.moveHeaderTo(cx, cy, true);
        }
        dragStateRef.current.lastX = cx;
        dragStateRef.current.lastY = cy;
      }
      dragStateRef.current.rafId = null;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current) return;
    const { moved, lastX, lastY } = dragStateRef.current;
    window.removeEventListener('mousemove', handleMouseMove, { capture: true });
    if (dragStateRef.current.rafId) cancelAnimationFrame(dragStateRef.current.rafId);
    dragStateRef.current = null;
    if (moved) {
      if (onOverlayPosChangeRef.current) {
        onOverlayPosChangeRef.current(lastX, lastY);
        onOverlayDragEndRef.current?.(lastX, lastY);
      } else {
        window.api?.mainHeader?.moveHeaderTo(lastX, lastY, false);
      }
      wasJustDraggedRef.current = true;
      setTimeout(() => { wasJustDraggedRef.current = false; }, 0);
    } else if (onOverlayPosChangeRef.current) {
      // Clic sans mouvement : libérer le main process (sinon _overlayDragging reste bloqué)
      onOverlayDragEndRef.current?.(lastX, lastY);
    }
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(async (e) => {
    const path = e.composedPath?.() || [];
    const isInteractive = path.some(n =>
      n?.classList?.contains('no-drag') ||
      n?.tagName === 'BUTTON' ||
      n?.classList?.contains('mh-btn') ||
      n?.classList?.contains('mh-wide-btn') ||
      n?.classList?.contains('marble-btn-container')
    );
    if (isInteractive) return;
    e.preventDefault();

    // Overlay mode: no async IPC needed — use current pill position from refs
    if (onOverlayPosChangeRef.current) {
      onOverlayDragStartRef.current?.(); // notify OverlayRoot: lock click-through OFF
      dragStateRef.current = {
        iMouseX: e.screenX, iMouseY: e.screenY,
        iWinX: overlayPosXRef.current, iWinY: overlayPosYRef.current,
        moved: false, rafId: null,
        lastX: overlayPosXRef.current, lastY: overlayPosYRef.current,
      };
      window.addEventListener('mousemove', handleMouseMove, { capture: true });
      window.addEventListener('mouseup', handleMouseUp, { once: true, capture: true });
      return;
    }

    if (!window.api?.mainHeader?.getHeaderPosition) return;

    // Guard: if user releases before IPC resolves, don't start drag
    let cancelled = false;
    const earlyUp = () => { cancelled = true; };
    window.addEventListener('mouseup', earlyUp, { once: true, capture: true });

    const pos = await window.api.mainHeader.getHeaderPosition();
    window.removeEventListener('mouseup', earlyUp, { capture: true });
    if (cancelled) return;

    dragStateRef.current = {
      iMouseX: e.screenX, iMouseY: e.screenY,
      iWinX: pos.x, iWinY: pos.y,
      moved: false, rafId: null,
      lastX: pos.x, lastY: pos.y,
    };
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { once: true, capture: true });
  }, [handleMouseMove, handleMouseUp]);

  // ── IPC ──────────────────────────────────────────────
  useEffect(() => {
    if (!window.api) return;

    // Sync with SharedState on mount AND on every subsequent change.
    // sharedState.get() is async (ipcRenderer.invoke), so we must .then().
    let disposed = false;
    const syncFromState = (state) => {
      if (!state || disposed) return;
      if (state.isListenRunning === true && listenStatusRef.current !== 'inSession') {
        setListenSessionStatus('inSession');
      }
    };

    try {
      const result = window.api.sharedState?.get?.();
      if (result && typeof result.then === 'function') {
        result.then(syncFromState).catch(() => {});
      } else if (result) {
        syncFromState(result);
      }
    } catch { /* ignore */ }

    const unsubscribeSharedState = window.api.sharedState?.subscribe?.(syncFromState);

    const onUserState = (_, s) => { setIsUserLoggedIn(s.isLoggedIn); setIsAuthenticating(false); };
    window.api.common?.onUserStateChanged?.(onUserState);
    window.api.common?.getCurrentUser?.().then(s => setIsUserLoggedIn(s?.isLoggedIn ?? false)).catch(() => {});
    const onAuthFailed = () => setIsAuthenticating(false);
    window.api.on?.('auth-failed', onAuthFailed);

    const onSession = (_, { success, state }) => {
      if (success) {
        const next = ['beforeSession', 'inSession', 'afterSession'].includes(state) ? state : 'beforeSession';
        setListenSessionStatus(next);
        if (next === 'beforeSession') {
          setAgentModeActive(false);
          setAgentMode(false);
          setIsPaused(false);
        }
      } else {
        setListenSessionStatus('beforeSession');
        setAgentModeActive(false);
        setAgentMode(false);
      }
      setIsTogglingSession(false);
    };
    window.api.mainHeader?.onListenChangeSessionResult?.(onSession);

    const onShortcuts = (_, kb) => setShortcuts(kb);
    window.api.mainHeader?.onShortcutsUpdated?.(onShortcuts);

    const onAreaSet = () => setHasPersistentArea(true);
    const onAreaCleared = () => setHasPersistentArea(false);
    window.api.common?.onPersistentAreaSet?.(onAreaSet);
    window.api.common?.onPersistentAreaCleared?.(onAreaCleared);
    window.api.common?.getPersistentAreaStatus?.().then(s => setHasPersistentArea(s.hasPersistentArea)).catch(() => {});

    const onPointer = (e) => window.api?.mainHeader?.notifyGlobalPointerDown?.({ x: e.screenX, y: e.screenY });
    window.addEventListener('pointerdown', onPointer, true);

    return () => {
      disposed = true;
      if (typeof unsubscribeSharedState === 'function') unsubscribeSharedState();
      window.api.common?.removeOnUserStateChanged?.(onUserState);
      window.api.mainHeader?.removeOnListenChangeSessionResult?.(onSession);
      window.api.mainHeader?.removeOnShortcutsUpdated?.(onShortcuts);
      window.api.common?.removeOnPersistentAreaSet?.(onAreaSet);
      window.api.common?.removeOnPersistentAreaCleared?.(onAreaCleared);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [setAgentMode]);

  // ── Resize window to match pill size ──────────────────
  useEffect(() => {
    if (!window.api?.headerController?.resizeHeaderWindow) return;
    // Login pill is ~220px; main pill is 580px
    window.api.headerController.resizeHeaderWindow({ width: isUserLoggedIn ? 580 : 190, height: 60 }).catch(() => {});
  }, [isUserLoggedIn]);

  // ── Animation ─────────────────────────────────────────
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onEnd = (e) => {
      if (e.target !== el) return;
      if (el.classList.contains('hiding')) {
        el.classList.add('hidden');
        window.api?.mainHeader?.sendHeaderAnimationFinished('hidden');
      } else if (el.classList.contains('showing')) {
        window.api?.mainHeader?.sendHeaderAnimationFinished('visible');
      }
    };
    el.addEventListener('animationend', onEnd);
    return () => el.removeEventListener('animationend', onEnd);
  }, []);

  // ── Handlers ─────────────────────────────────────────
  const handleListen = useCallback(async () => {
    if (wasJustDraggedRef.current || isTogglingSession) return;
    const currentStatus = listenStatusRef.current;
    setIsTogglingSession(true);
    try {
      if (currentStatus === 'beforeSession') {
        await window.api.mainHeader.sendListenButtonClick('Listen');
      } else if (currentStatus === 'inSession') {
        // Stop recording then immediately close the listen panel in one click
        await window.api.mainHeader.sendListenButtonClick('Stop');
        await window.api.mainHeader.sendListenButtonClick('Done');
      } else if (currentStatus === 'afterSession') {
        await window.api.mainHeader.sendListenButtonClick('Done');
      }
      setTimeout(() => setIsTogglingSession(false), 500);
    } catch { setIsTogglingSession(false); }
  }, [isTogglingSession]);

  const handleAsk = useCallback(async () => {
    if (wasJustDraggedRef.current) return;
    try {
      await window.api.mainHeader.sendAskButtonClick();
    } catch {}
  }, []);

  const handleToggle = useCallback(async () => {
    if (wasJustDraggedRef.current) return;
    try { await window.api.mainHeader.sendToggleAllWindowsVisibility(); } catch {}
  }, []);

  const handleScreenContext = useCallback(() => {
    if (wasJustDraggedRef.current) return;
    const next = !askScreenContext;
    setAskScreenContext(next);
    window.dispatchEvent(new CustomEvent('ask:setScreenContext', { detail: { active: next } }));
  }, [askScreenContext]);

  const handleAppQuit = useCallback(() => {
    setAnimClass('hiding');
    setTimeout(() => {
      window.api.common.quitApplication();
    }, 280);
  }, []);

  const handleAgents = useCallback((e) => {
    e?.stopPropagation();
    if (wasJustDraggedRef.current) return;
    window.api?.mainHeader?.toggleAgentSelectorWindow?.();
  }, []);

  const handleSettings = useCallback((e) => {
    if (wasJustDraggedRef.current) return;
    e.stopPropagation();
    const now = Date.now();
    if (now - lastSettingsToggleRef.current < 400) return;
    lastSettingsToggleRef.current = now;
    window.api?.mainHeader?.toggleSettingsWindow?.();
  }, []);

  const handleLogin = useCallback(async () => {
    if (wasJustDraggedRef.current || isAuthenticating) return;
    setIsAuthenticating(true);
    // Auto-reset after 2 min if deeplink never comes back
    const authTimeout = setTimeout(() => setIsAuthenticating(false), 120_000);
    try {
      const r = await window.api.common.startFirebaseAuth();
      if (!r?.success) { clearTimeout(authTimeout); setIsAuthenticating(false); }
    } catch { clearTimeout(authTimeout); setIsAuthenticating(false); }
  }, [isAuthenticating]);

  const handlePauseToggle = useCallback(async () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    try {
      if (newPaused) {
        await window.api.invoke?.('listen:pause-microphone');
        await window.api.invoke?.('listen:pause-system-audio');
      } else {
        await window.api.invoke?.('listen:resume-microphone');
        await window.api.invoke?.('listen:resume-system-audio');
      }
    } catch(e) {}
  }, [isPaused]);

  const handleTTSToggle = useCallback(({ ttsEnabled: v, originalState }) => {
    setTtsEnabled(v);
    if (v) { setAgentModeActive(true); setAgentMode(true); }
    else { setAgentModeActive(false); setAgentMode(false); }
  }, [setAgentMode]);

  const isListening = listenSessionStatus === 'inSession';

  // ── Click-through: transparent area passes clicks, only pill is interactive ──
  // (In overlay mode, OverlayRoot handles click-through for the whole overlay.)
  const clickThroughRef = useRef(true);
  const updateClickThrough = useCallback((e) => {
    if (overlayMode) return; // Handled by OverlayRoot
    if (!window.api?.mainHeader?.setHeaderClickThrough) return;
    const pill = document.querySelector('.mh-pill, .mh-login-pill');
    const quitBtn = document.querySelector('.mh-quit-btn');
    if (!pill) return;
    const rect = pill.getBoundingClientRect();
    const qRect = quitBtn?.getBoundingClientRect();
    const inside = (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top  && e.clientY <= rect.bottom) ||
                   !!(qRect && e.clientX >= qRect.left && e.clientX <= qRect.right &&
                      e.clientY >= qRect.top && e.clientY <= qRect.bottom);
    if (inside && clickThroughRef.current) {
      clickThroughRef.current = false;
      window.api.mainHeader.setHeaderClickThrough(false);
    } else if (!inside && !clickThroughRef.current) {
      clickThroughRef.current = true;
      window.api.mainHeader.setHeaderClickThrough(true);
    }
  }, [overlayMode]);
  useEffect(() => {
    window.addEventListener('mousemove', updateClickThrough);
    return () => window.removeEventListener('mousemove', updateClickThrough);
  }, [updateClickThrough]);

  return (
    <div ref={hostRef} className={`mh-root ${animClass}${overlayMode ? ' overlay-mode' : ''}`}>
      {!isUserLoggedIn ? (
        /* ── Login pill ── */
        <>
          <div className="mh-login-pill" onMouseDown={handleMouseDown}>
            <div className="mh-listen-section">
              <button className="mh-ctrl mic no-drag" disabled title="Start listening">
                <IconMic />
              </button>
            </div>
            <button className="mh-sign-in-btn no-drag" onClick={handleLogin} disabled={isAuthenticating}>
              {isAuthenticating ? 'Connexion…' : 'Connexion'}
            </button>
          </div>
          <button
            className="mh-quit-btn"
            onClick={handleAppQuit}
            title="Quitter"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </>
      ) : (
        /* ── Main pill ── */
        <div className={`mh-pill ${justLoggedIn ? 'animating-in' : ''}`} onMouseDown={handleMouseDown}>

          {/* Session controls */}
          <div className="mh-listen-section">
            {listenSessionStatus === 'beforeSession' ? (
              <button
                key="mic"
                className="mh-ctrl mic mh-ctrl-pop no-drag"
                onClick={handleListen}
                disabled={isTogglingSession}
                title="Start listening"
              >
                {isTogglingSession ? <div className="mh-spinner" /> : <IconMic />}
              </button>
            ) : (
              <div key="controls" className="mh-listen-controls">
                <button
                  className="mh-ctrl mh-ctrl-pop no-drag"
                  onClick={handlePauseToggle}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <IconPlay /> : <IconPause />}
                </button>
                <button
                  className="mh-ctrl stop mh-ctrl-pop2 no-drag"
                  onClick={handleListen}
                  disabled={isTogglingSession}
                  title="Stop"
                >
                  <IconStop />
                </button>
              </div>
            )}
          </div>

          {/* Ask */}
          <button className="mh-wide-btn no-drag" onClick={handleAsk} title="Ask AI">
            <IconAsk />
            Hide
            <ShortcutBadge accelerator={shortcuts.nextStep} />
          </button>

          {isListening && (
            <div className={`mh-rec-wave${isPaused ? ' paused' : ''}`}>
              <span ref={waveBarRefs[0]} style={isPaused ? undefined : { animation: 'none', transform: 'scaleY(0.28)', opacity: 0.45 }} />
              <span ref={waveBarRefs[1]} style={isPaused ? undefined : { animation: 'none', transform: 'scaleY(0.28)', opacity: 0.45 }} />
              <span ref={waveBarRefs[2]} style={isPaused ? undefined : { animation: 'none', transform: 'scaleY(0.28)', opacity: 0.45 }} />
            </div>
          )}

          {/* Screen context for Ask */}
          <button
            className={`mh-btn no-drag${askScreenContext ? ' accent' : ''}`}
            onClick={handleScreenContext}
            title={askScreenContext ? "Contexte écran activé" : "Inclure l'écran dans Ask"}
          >
            <IconScreen />
          </button>

          <div className="mh-divider" />

          {/* Agents */}
          <button
            className="mh-btn no-drag"
            onClick={handleAgents}
            title="AI Agents"
          >
            <IconAgents />
          </button>

          {/* Settings */}
          <button className="mh-btn no-drag" onClick={handleSettings} title="Settings">
            <IconSettings />
          </button>

        </div>
      )}
    </div>
  );
}
