import React, { useState, useEffect, useRef, useCallback } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes sv-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes sv-fadeout { 0% { opacity: 1; } 100% { opacity: 0; transform: scale(0.97); } }

.sv-root {
  display: block; width: 100%; height: 100%;
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased; cursor: default; user-select: none;
}
.sv-root.quitting { animation: sv-fadeout 0.22s ease forwards; }

.sv-container {
  display: flex; flex-direction: column;
  background: linear-gradient(to bottom, #18171cbf, #18171ccc); border-radius: 16px;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  overflow: hidden; padding: 0; position: relative;
}
.sv-container::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 16px; padding: 1px;
  background: linear-gradient(169deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.18) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  pointer-events: none; z-index: 2;
}
.sv-container::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.15); border-radius: 12px; z-index: -1;
}

.sv-header {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 14px 11px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sv-logo { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; }
.sv-header-text { flex: 1; min-width: 0; }
.sv-app-title { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.88); margin: 0; line-height: 1.3; letter-spacing: -0.01em; }
.sv-account-info { font-size: 10.5px; color: rgba(255,255,255,0.35); margin: 0; font-weight: 400; }
.sv-invisibility-badge {
  font-size: 9.5px; font-weight: 500; padding: 2px 6px; border-radius: 4px;
  background: rgba(234,179,8,0.10); border: 1px solid rgba(234,179,8,0.20); color: rgba(234,179,8,0.80);
  opacity: 0; transition: opacity 0.2s;
}
.sv-invisibility-badge.visible { opacity: 1; }

.sv-section { padding: 8px 14px; }
.sv-section + .sv-section { border-top: 1px solid rgba(255,255,255,0.05); }
.sv-section-label {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(255,255,255,0.22); display: block; margin-bottom: 7px;
}

.sv-shortcut-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 3.5px 0; color: rgba(255,255,255,0.62); font-size: 11.5px;
}
.sv-shortcut-name { font-weight: 400; }
.sv-shortcut-keys { display: flex; align-items: center; gap: 2px; }
.sv-shortcut-key {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px; min-width: 18px; height: 16px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.55); font-family: inherit;
}

.sv-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; position: relative; z-index: 5; pointer-events: auto; }
.sv-toggle-label { font-size: 12px; color: rgba(255,255,255,0.68); font-weight: 400; }
.sv-toggle-switch {
  position: relative; width: 32px; height: 18px;
  background: rgba(255,255,255,0.11); border-radius: 9px; cursor: pointer; transition: background 0.22s; flex-shrink: 0;
}
.sv-toggle-switch.enabled { background: #0A84FF; }
.sv-toggle-slider {
  position: absolute; top: 2.5px; left: 2.5px; width: 13px; height: 13px;
  background: #fff; border-radius: 50%; transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.sv-toggle-switch.enabled .sv-toggle-slider { transform: translateX(14px); }

.sv-toggle-lock {
  font-size: 10px; padding: 1px 6px; border-radius: 5px;
  background: linear-gradient(135deg, rgba(100,60,220,0.20), rgba(60,80,255,0.14));
  border: 1px solid rgba(140,100,255,0.28);
  color: rgba(170,140,255,0.90); font-weight: 600; letter-spacing: 0.03em;
  white-space: nowrap;
}

.sv-btn-row { display: flex; gap: 6px; padding: 10px 14px 22px; border-top: 1px solid rgba(255,255,255,0.06); position: relative; z-index: 10; }
.sv-btn {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px; color: rgba(255,255,255,0.72); padding: 7px 10px;
  font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: background 0.12s, color 0.12s;
  position: relative; z-index: 10; pointer-events: auto;
  transform: translateZ(0);
}
.sv-btn:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.92); }
.sv-btn:active { transform: translateZ(0) scale(0.98); }
.sv-btn.danger { background: rgba(255,59,48,0.08); border-color: rgba(255,59,48,0.18); color: rgba(255,105,97,0.90); }
.sv-btn.danger:hover { background: rgba(255,59,48,0.14); }

.sv-loading-state { display: flex; align-items: center; justify-content: center; padding: 24px; color: rgba(255,255,255,0.45); font-size: 12px; }
.sv-loading-spinner { width: 12px; height: 12px; border: 1.5px solid rgba(255,255,255,0.12); border-top-color: rgba(96,195,230,0.8); border-radius: 50%; animation: sv-spin 1s linear infinite; margin-right: 8px; }
`;

const KEY_MAP = {
  'Cmd': '⌘', 'Command': '⌘', 'Ctrl': '⌃', 'Alt': '⌥', 'Shift': '⇧', 'Enter': '↵',
  'Up': '↑', 'Down': '↓', 'Left': '←', 'Right': '→'
};

function renderShortcutKeys(accelerator) {
  if (!accelerator) return [<span key="na" className="sv-shortcut-key">N/A</span>];

  if (accelerator.includes('↕')) {
    const keys = [...accelerator.replace('↕', '').split('+'), '↕'];
    return keys.map((key, i) => <span key={i} className="sv-shortcut-key">{KEY_MAP[key] || key}</span>);
  }

  const keys = accelerator.split('+');
  return keys.map((key, i) => <span key={i} className="sv-shortcut-key">{KEY_MAP[key] || key}</span>);
}

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('xerus:theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const el = document.documentElement;
    if (isDark) { el.classList.add('dark'); el.classList.remove('light'); }
    else { el.classList.add('light'); el.classList.remove('dark'); }
  }, [isDark]);

  useEffect(() => {
    if (!window.api) return;
    const handler = (event, theme) => {
      setIsDark(theme === 'dark');
      localStorage.setItem('xerus:theme', theme);
    };
    window.api.common.onThemeChanged(handler);
    return () => {};
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = isDark ? 'light' : 'dark';
    try {
      if (window.api && window.api.common && window.api.common.setTheme) {
        await window.api.common.setTheme(newTheme);
      }
    } catch (e) {}
    setIsDark(!isDark);
    localStorage.setItem('xerus:theme', newTheme);
  }, [isDark]);

  return { isDark, toggleTheme };
}

export default function SettingsView() {
  const [isLoading, setIsLoading] = useState(false);
  // Use cached email from localStorage so the user appears connected immediately on open
  const [firebaseUser, setFirebaseUser] = useState(() => {
    try {
      const cached = localStorage.getItem('sv:userEmail');
      return cached ? { email: cached, isLoggedIn: true } : null;
    } catch { return null; }
  });
  const [shortcuts, setShortcuts] = useState({});
  const [isContentProtectionOn, setIsContentProtectionOn] = useState(true);
  const [isQuitting, setIsQuitting] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const containerRef = useRef(null);

  injectStyles('settings-view-styles', CSS);

  // Dispatch real rendered size so OverlayRoot hit-rects cover the buttons
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const dispatch = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        window.dispatchEvent(new CustomEvent('local-panel-resize', {
          detail: { name: 'settings', width: 240, height: h + 4 }
        }));
      }
    };
    const raf = requestAnimationFrame(dispatch);
    return () => cancelAnimationFrame(raf);
  }, [isLoading]);

  useEffect(() => {
    if (!window.api) { setIsLoading(false); return; }

    const loadInitialData = async () => {
      try {
        const [userState, shortcuts, contentProtection, subscription] = await Promise.all([
          window.api.settingsView.getCurrentUser(),
          window.api.settingsView.getCurrentShortcuts(),
          window.api.settingsView.getContentProtectionStatus(),
          window.api.settingsView.getSubscriptionStatus().catch(() => ({ plan: 'free' })),
        ]);

        if (userState && userState.isLoggedIn) {
          setFirebaseUser(userState);
          try { localStorage.setItem('sv:userEmail', userState.email || ''); } catch {}
        }
        setShortcuts(shortcuts || {});
        setIsContentProtectionOn(contentProtection);
        setUserPlan(subscription?.plan || 'free');
      } catch (error) {
        console.error('[SettingsView] Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    const userStateListener = (event, userState) => {
      if (userState && userState.isLoggedIn) {
        setFirebaseUser(userState);
      } else {
        setFirebaseUser(null);
        // Close the settings panel when the user logs out
        window.dispatchEvent(new CustomEvent('local-panel-close', { detail: { name: 'settings' } }));
      }
    };
    const shortcutListener = (event, keybinds) => setShortcuts(keybinds);

    window.api.settingsView.onUserStateChanged(userStateListener);
    window.api.settingsView.onShortcutsUpdated(shortcutListener);

    return () => {
      window.api.settingsView.removeOnUserStateChanged(userStateListener);
      window.api.settingsView.removeOnShortcutsUpdated(shortcutListener);
    };
  }, []);

  const getMainShortcuts = useCallback(() => [
    { name: 'Show / Hide', accelerator: shortcuts.toggleVisibility },
    { name: 'Ask Anything', accelerator: shortcuts.nextStep },
    { name: 'Scroll Up Response', accelerator: shortcuts.scrollUp },
    { name: 'Scroll Down Response', accelerator: shortcuts.scrollDown },
  ], [shortcuts]);

  const handleToggleInvisibility = useCallback(async () => {
    const result = await window.api.settingsView.toggleContentProtection();
    setIsContentProtectionOn(result);
  }, []);

  const handleFirebaseLogout = useCallback(() => {
    localStorage.setItem('manuallyLoggedOut', 'true');
    window.api.settingsView.firebaseLogout();
  }, []);

  const handleUsePicklesKey = useCallback((e) => {
    e.preventDefault();
    window.api.settingsView.startFirebaseAuth();
  }, []);

  const handleQuit = useCallback(() => {
    setIsQuitting(true);
    setTimeout(() => {
      window.api.settingsView.quitApplication();
    }, 280);
  }, []);

  if (isLoading) {
    return (
      <div className="sv-root">
        <div className="sv-container">
          <div className="sv-loading-state">
            <div className="sv-loading-spinner" />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`sv-root${isQuitting ? ' quitting' : ''}`}>
      <div ref={containerRef} className="sv-container" style={{ position: 'relative' }}>

        <div className="sv-header">
          <img src="../assets/logo.png" className="sv-logo" alt="Claire" />
          <div className="sv-header-text">
            <div className="sv-app-title">Claire</div>
            <div className="sv-account-info">
              {firebaseUser ? (firebaseUser.email || 'Connecté') : 'Non connecté'}
            </div>
          </div>
          <div className={`sv-invisibility-badge${!isContentProtectionOn ? ' visible' : ''}`}>Visible</div>
        </div>

        <div className="sv-section">
          <span className="sv-section-label">Raccourcis</span>
          {getMainShortcuts().map(s => (
            <div key={s.name} className="sv-shortcut-item">
              <span className="sv-shortcut-name">{s.name}</span>
              <div className="sv-shortcut-keys">{renderShortcutKeys(s.accelerator)}</div>
            </div>
          ))}
        </div>

        <div className="sv-section">
          <div className="sv-toggle-row" onClick={handleToggleInvisibility} style={{ cursor: 'pointer' }}>
            <span className="sv-toggle-label">Protection de contenu</span>
            <div className={`sv-toggle-switch${isContentProtectionOn ? ' enabled' : ''}`}>
              <div className="sv-toggle-slider" />
            </div>
          </div>
        </div>

        <div className="sv-btn-row">
          {firebaseUser ? (
            <button className="sv-btn danger" onClick={handleFirebaseLogout}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Déconnexion
            </button>
          ) : (
            <button className="sv-btn" onClick={handleUsePicklesKey}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
              Connexion
            </button>
          )}
          <button className="sv-btn danger" onClick={handleQuit}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
            Quitter
          </button>
        </div>

      </div>
    </div>
  );
}
