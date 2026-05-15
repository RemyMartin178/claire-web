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
  width: 100vw;
  height: 100vh;
  padding: 2px;
  background: transparent;
  font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.mh-root * {
  font-family: inherit;
  user-select: none;
  cursor: default;
}
.mh-root.hiding  { animation: mh-up   0.28s cubic-bezier(0.4, 0, 1, 1)         forwards; }
.mh-root.showing { animation: mh-down 0.38s cubic-bezier(0.34, 1.3, 0.64, 1)   forwards; }
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

.mh-root.overlay-mode {
  width: 163px;
  height: 50px;
}
.mh-root.overlay-mode .mh-pill,
.mh-root.overlay-mode .mh-login-pill {
  -webkit-app-region: no-drag;
}

/* ── PILL ── */
.mh-pill {
  -webkit-app-region: drag;
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background: transparent;
  overflow: hidden;
  user-select: none;
  box-shadow: 0 0 0 1px rgba(207, 226, 255, 0.24), 0 -0.5px 0 0 rgba(255, 255, 255, 0.8);
}
.mh-pill::before {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: hsla(252, 10%, 10%, 0.8);
  transition: filter 75ms ease;
}
.mh-pill:hover::before { filter: brightness(3); }
.mh-controls {
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-left: 8px;
  padding-right: 9px;
}

/* ── POST-LOGIN ANIMATION ── */
@keyframes mh-pill-reveal {
  0%   { max-width: 120px; opacity: 0.5; }
  100% { max-width: 220px; opacity: 1; }
}
@keyframes mh-item-slide {
  0%   { opacity: 0; transform: translateX(-12px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
.mh-pill.animating-in {
  animation: mh-pill-reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  white-space: nowrap;
}
.mh-pill.animating-in > * {
  opacity: 0;
  animation: mh-item-slide 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.mh-pill.animating-in > *:nth-child(1) { animation-delay: 0.05s; }
.mh-pill.animating-in > *:nth-child(2) { animation-delay: 0.12s; }
.mh-pill.animating-in > *:nth-child(3) { animation-delay: 0.20s; }

/* ── LOGO ── */
.mh-logo {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  object-fit: cover;
  flex-shrink: 0;
  pointer-events: none;
  filter: brightness(0) invert(1);
}

/* ── WIDE BUTTON (Ask / Cacher) ── */
.mh-wide-btn {
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  width: 66px;
  padding: 0;
  border-radius: 100px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
  pointer-events: auto;
}
.mh-wide-btn:hover  { transform: scale(1.05); filter: brightness(1.25); }
.mh-wide-btn:active { transform: scale(0.94); }
.mh-wide-btn svg { opacity: 1; }
.mh-wide-btn::before,
.mh-wide-btn::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  transition: opacity 0.2s ease-out;
}
.mh-wide-btn::before {
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  opacity: 0;
}
.mh-wide-btn::after {
  background: linear-gradient(#0544a9,#022c70);
  box-shadow: 0 0 0 0.5px #0c44a1, 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #022c70, inset 0 0.5px #81b6ff;
  opacity: 1;
}
.mh-wide-btn.chat-visible::before { opacity: 1; }
.mh-wide-btn.chat-visible::after { opacity: 0; }
.mh-wide-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── ACTION BUTTON (Mic / Stop) ── */
.mh-action-btn {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  color: #fff;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.12s ease;
  flex-shrink: 0;
  pointer-events: auto;
}
.mh-action-btn:hover  { filter: brightness(1.25); color: #fff; }
.mh-action-btn:active { transform: scale(0.94); }
.mh-action-btn:disabled { opacity: 0.60; cursor: default; pointer-events: none; }

/* ── SPINNER ── */
@keyframes mh-spin { to { transform: rotate(360deg); } }
.mh-spinner {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,0.20);
  border-top-color: rgba(255,255,255,0.80);
  border-radius: 50%;
  animation: mh-spin 0.7s linear infinite;
}

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
  flex-wrap: nowrap;
  white-space: nowrap;
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
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 110px;
}
.mh-sign-in-btn:hover    { filter: brightness(1.18); }
.mh-sign-in-btn:disabled { opacity: 0.5; cursor: default; }

/* Login mic icon placeholder */
.mh-login-mic {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  color: rgba(255,255,255,0.40);
  flex-shrink: 0;
}

/* ── QUIT BUTTON ── */
.mh-quit-btn {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(#2e3039,#272a31);
  box-shadow: 0 85px 34px #00000005, 0 48px 29px #00000014, 0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #16171a, inset 0 0.5px #afb3c4;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  margin-left: 8px;
  transition: filter 0.12s ease, color 0.12s ease;
}
.mh-quit-btn:hover { filter: brightness(1.18); color: rgba(255,255,255,0.95); }
`;

/* ── ICONS ── */
const IconSparkles = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
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

const IconStop = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2.5"/>
  </svg>
);

const LOGO_SRC = '../assets/logo.png';

export default function MainHeader({
  overlayMode = false,
  overlayPosX = 0,
  overlayPosY = 0,
  onOverlayPosChange = null,
  onOverlayDragEnd = null,
  onOverlayDragStart = null,
} = {}) {
  const [isTogglingSession, setIsTogglingSession] = useState(false);
  const [isPaused, setIsPaused]                   = useState(false);
  const [listenSessionStatus, setListenSessionStatus] = useState('beforeSession');
  const [isUserLoggedIn, setIsUserLoggedIn]        = useState(false);
  const [isAuthenticating, setIsAuthenticating]    = useState(false);
  const [animClass, setAnimClass]                  = useState('sliding-in');
  const [justLoggedIn, setJustLoggedIn]            = useState(false);
  const [showChat, setShowChat]                    = useState(false);

  const hostRef                = useRef(null);
  const wasJustDraggedRef      = useRef(false);
  const dragStateRef           = useRef(null);
  const prevIsUserLoggedIn     = useRef(isUserLoggedIn);
  const listenStatusRef        = useRef('beforeSession');

  const overlayPosXRef         = useRef(overlayPosX);
  const overlayPosYRef         = useRef(overlayPosY);
  const onOverlayPosChangeRef  = useRef(onOverlayPosChange);
  const onOverlayDragEndRef    = useRef(onOverlayDragEnd);
  const onOverlayDragStartRef  = useRef(onOverlayDragStart);

  useEffect(() => { overlayPosXRef.current        = overlayPosX; },        [overlayPosX]);
  useEffect(() => { overlayPosYRef.current        = overlayPosY; },        [overlayPosY]);
  useEffect(() => { onOverlayPosChangeRef.current = onOverlayPosChange; }, [onOverlayPosChange]);
  useEffect(() => { onOverlayDragEndRef.current   = onOverlayDragEnd; },   [onOverlayDragEnd]);
  useEffect(() => { onOverlayDragStartRef.current = onOverlayDragStart; }, [onOverlayDragStart]);
  useEffect(() => { listenStatusRef.current       = listenSessionStatus; }, [listenSessionStatus]);

  injectStyles('mh-styles-v3', CSS);

  // Post-login animation
  useEffect(() => {
    if (!prevIsUserLoggedIn.current && isUserLoggedIn) {
      setJustLoggedIn(true);
      const t = setTimeout(() => setJustLoggedIn(false), 900);
      return () => clearTimeout(t);
    }
    prevIsUserLoggedIn.current = isUserLoggedIn;
  }, [isUserLoggedIn]);

  // ── Drag ──────────────────────────────────────────────────────────────────
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
      if (nx !== dragStateRef.current.lastX || ny !== dragStateRef.current.lastY) {
        if (onOverlayPosChangeRef.current) {
          onOverlayPosChangeRef.current(nx, ny);
        } else {
          window.api?.mainHeader?.moveHeaderTo(nx, ny, true);
        }
        dragStateRef.current.lastX = nx;
        dragStateRef.current.lastY = ny;
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
      onOverlayDragEndRef.current?.(lastX, lastY);
    }
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(async (e) => {
    const path = e.composedPath?.() || [];
    const isInteractive = path.some(n =>
      n?.classList?.contains('no-drag') ||
      n?.tagName === 'BUTTON'
    );
    if (isInteractive) return;
    e.preventDefault();

    if (onOverlayPosChangeRef.current) {
      onOverlayDragStartRef.current?.();
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

  // ── IPC ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.api) return;
    let disposed = false;

    const syncFromState = (state) => {
      if (!state || disposed) return;
      if (state.isListenRunning === true && listenStatusRef.current !== 'inSession') {
        setListenSessionStatus('inSession');
        setIsTogglingSession(false);
      }
      if (state.isListenRunning === false && listenStatusRef.current === 'inSession') {
        setListenSessionStatus('beforeSession');
        setIsTogglingSession(false);
      }
      setShowChat(Boolean(state.showChat));
    };
    try {
      const result = window.api.sharedState?.get?.();
      if (result && typeof result.then === 'function') {
        result.then(syncFromState).catch(() => {});
      } else if (result) {
        syncFromState(result);
      }
    } catch {}

    const unsubSharedState = window.api.sharedState?.subscribe?.(syncFromState);

    const onUserState = (_, s) => { setIsUserLoggedIn(s.isLoggedIn); setIsAuthenticating(false); };
    window.api.common?.onUserStateChanged?.(onUserState);
    window.api.common?.getCurrentUser?.().then(s => setIsUserLoggedIn(s?.isLoggedIn ?? false)).catch(() => {});

    const onAuthFailed = () => setIsAuthenticating(false);
    window.api.on?.('auth-failed', onAuthFailed);

    const onSession = (_, { success, state }) => {
      if (success) {
        const next = ['beforeSession', 'inSession', 'afterSession'].includes(state) ? state : 'beforeSession';
        setListenSessionStatus(next);
        if (next === 'beforeSession') setIsPaused(false);
      } else {
        setListenSessionStatus('beforeSession');
      }
      setIsTogglingSession(false);
    };
    window.api.mainHeader?.onListenChangeSessionResult?.(onSession);

    const onPointer = (e) => window.api?.mainHeader?.notifyGlobalPointerDown?.({ x: e.screenX, y: e.screenY });
    window.addEventListener('pointerdown', onPointer, true);

    return () => {
      disposed = true;
      if (typeof unsubSharedState === 'function') unsubSharedState();
      window.api.common?.removeOnUserStateChanged?.(onUserState);
      window.api.mainHeader?.removeOnListenChangeSessionResult?.(onSession);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);

  // ── Window resize to match pill ──────────────────────────────────────────
  useEffect(() => {
    if (!window.api?.headerController?.resizeHeaderWindow) return;
    window.api.headerController.resizeHeaderWindow({
      width:  isUserLoggedIn ? 163 : 190,
      height: isUserLoggedIn ? 50 : 60,
    }).catch(() => {});
  }, [isUserLoggedIn]);

  // ── Animation end ─────────────────────────────────────────────────────────
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

  // ── Click-through ─────────────────────────────────────────────────────────
  const clickThroughRef = useRef(true);
  const updateClickThrough = useCallback((e) => {
    if (overlayMode) return;
    if (!window.api?.mainHeader?.setHeaderClickThrough) return;
    const pill = document.querySelector('.mh-pill, .mh-login-pill');
    const quitBtn = document.querySelector('.mh-quit-btn');
    if (!pill) return;
    const rect  = pill.getBoundingClientRect();
    const qRect = quitBtn?.getBoundingClientRect();
    const inside = (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom
    ) || !!(qRect &&
      e.clientX >= qRect.left && e.clientX <= qRect.right &&
      e.clientY >= qRect.top  && e.clientY <= qRect.bottom
    );
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleListen = useCallback(async () => {
    if (wasJustDraggedRef.current || isTogglingSession) return;
    const currentStatus = listenStatusRef.current;
    setIsTogglingSession(true);
    try {
      if (currentStatus === 'beforeSession') {
        await window.api.mainHeader.sendListenButtonClick('Listen');
      } else if (currentStatus === 'inSession') {
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
      await window.api.sharedState?.patch?.({ showChat: true });
    } catch {}
  }, []);

  const handleChatToggle = useCallback(async () => {
    if (wasJustDraggedRef.current) return;
    try { await window.api.sharedState?.patch?.({ showChat: !showChat }); } catch {}
  }, [showChat]);

  const handlePillClick = useCallback(async (e) => {
    if (wasJustDraggedRef.current) return;
    const path = e.composedPath?.() || [];
    const isInteractive = path.some(n =>
      n?.classList?.contains('no-drag') ||
      n?.tagName === 'BUTTON'
    );
    if (isInteractive) return;
    try {
      const state = await window.api.sharedState?.get?.();
      await window.api.sharedState?.patch?.({
        showDashboard: true,
        dashboardFocusCount: (state?.dashboardFocusCount || 0) + 1,
      });
    } catch {}
  }, []);

  const handleLogin = useCallback(async () => {
    if (wasJustDraggedRef.current || isAuthenticating) return;
    setIsAuthenticating(true);
    const authTimeout = setTimeout(() => setIsAuthenticating(false), 120_000);
    try {
      const r = await window.api.common.startFirebaseAuth();
      if (!r?.success) { clearTimeout(authTimeout); setIsAuthenticating(false); }
    } catch { clearTimeout(authTimeout); setIsAuthenticating(false); }
  }, [isAuthenticating]);

  const handleAppQuit = useCallback(() => {
    setAnimClass('hiding');
    setTimeout(() => { window.api.common.quitApplication(); }, 280);
  }, []);

  const isListening = listenSessionStatus === 'inSession';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={hostRef} className={`mh-root ${animClass}${overlayMode ? ' overlay-mode' : ''}`}>
      {!isUserLoggedIn ? (
        <>
          <div className="mh-login-pill" onMouseDown={handleMouseDown}>
            <div className="mh-login-mic">
              <IconMic />
            </div>
            <button
              className="mh-sign-in-btn no-drag"
              onClick={handleLogin}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'Connexion…' : 'Connexion'}
            </button>
          </div>
          <button className="mh-quit-btn" onClick={handleAppQuit} title="Quitter">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </>
      ) : (
        <div
          className={`mh-pill${justLoggedIn ? ' animating-in' : ''}`}
          onMouseDown={handleMouseDown}
          onClick={handlePillClick}
        >
          {/* Logo */}
          <img className="mh-logo" src={LOGO_SRC} alt="" draggable={false} />

          <div className="mh-controls">
          {/* Wide button: Ask ↔ Cacher */}
          <button
              className={`mh-wide-btn no-drag${isListening && showChat ? ' chat-visible' : ''}`}
            onClick={isListening ? handleChatToggle : handleAsk}
            tabIndex={-1}
            type="button"
          >
            <span className="mh-wide-content">
              {isListening && showChat ? <IconChevronDown /> : <IconSparkles />}
              {isListening && showChat ? 'Hide' : 'Ask'}
            </span>
          </button>

          {/* Action button: Mic ↔ Stop */}
          <button
            className="mh-action-btn no-drag"
            onClick={handleListen}
            disabled={isTogglingSession}
            title={isListening ? 'Arrêter' : 'Démarrer'}
            tabIndex={-1}
            type="button"
          >
            {isTogglingSession
              ? <div className="mh-spinner" />
              : isListening
                ? <IconStop />
                : <IconMic />
            }
          </button>
          </div>
        </div>
      )}
    </div>
  );
}
