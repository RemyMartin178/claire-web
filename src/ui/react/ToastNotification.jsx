import React, { useState, useEffect, useCallback, useRef } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes toast-in {
  from { opacity: 0; transform: translateX(16px) scale(0.96); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to   { opacity: 0; transform: translateX(12px) scale(0.96); }
}

.toast-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
}

.toast-card {
  background: rgba(22, 22, 26, 0.96);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  padding: 11px 14px 11px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  max-width: 340px;
  pointer-events: auto !important;
  -webkit-app-region: no-drag;
  animation: toast-in 0.26s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.toast-card.toast-leaving {
  animation: toast-out 0.20s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}

.toast-logo {
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.toast-logo img {
  width: 100%; height: 100%; object-fit: cover; border-radius: 8px;
}

.toast-body { flex: 1; min-width: 0; }
.toast-subtitle {
  font-size: 10.5px;
  color: rgba(255,255,255,0.38);
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
  font-weight: 500;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}
.toast-title {
  font-size: 13px;
  color: rgba(255,255,255,0.90);
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
  font-weight: 600;
  line-height: 1.38;
  word-break: break-word;
  letter-spacing: -0.01em;
}

.toast-dismiss {
  background: none; border: none; padding: 4px; cursor: pointer;
  color: rgba(255,255,255,0.40); flex-shrink: 0;
  transition: color 0.12s;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto !important;
  -webkit-app-region: no-drag;
}
.toast-dismiss:hover { color: rgba(255,255,255,0.80); }

.toast-action {
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
  color: #CBE3FF;
  box-shadow: 0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff;
  border: none;
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 11.5px;
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  pointer-events: auto !important;
  -webkit-app-region: no-drag;
  letter-spacing: -0.01em;
  transition: opacity 0.12s;
}
.toast-action:hover { opacity: 0.85; }
`;

let toastIdCounter = 0;

const LOGO_SRC = '../assets/logo.png';

// Global event bus for internal toasts
export function showToast({ icon = 'info', title, subtitle, duration = 4000, action = null }) {
  window.dispatchEvent(new CustomEvent('claire-toast', { detail: { icon, title, subtitle, duration, action } }));
}

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  injectStyles('toast-styles', CSS);

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new CustomEvent('claire-toast-changed'));
    }, 240);
  }, []);

  const handleAction = useCallback((toast) => {
    if (toast.action?.channel) {
      window.api?.invoke?.(toast.action.channel);
    }
    dismiss(toast.id);
  }, [dismiss]);

  const addToast = useCallback(({ icon = 'info', title, subtitle, duration = 4000, action = null }) => {
    if (!title) return;
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, icon, title, subtitle, leaving: false, action }]);
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('claire-toast-changed')));
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  useEffect(() => {
    const handleCustom = (e) => addToast(e.detail);
    window.addEventListener('claire-toast', handleCustom);

    let ipcRemover = null;
    if (window.api?.common?.onShowToast) {
      const handler = (_, data) => addToast(data);
      window.api.common.onShowToast(handler);
      ipcRemover = () => window.api.common.removeOnShowToast?.(handler);
    }

    return () => {
      window.removeEventListener('claire-toast', handleCustom);
      ipcRemover?.();
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-wrapper">
      {toasts.map(t => (
        <div key={t.id} className={`toast-card${t.leaving ? ' toast-leaving' : ''}`}>
          <div className="toast-logo">
            <img src={LOGO_SRC} alt="" />
          </div>
          <div className="toast-body">
            {t.subtitle && <div className="toast-subtitle">{t.subtitle}</div>}
            <div className="toast-title">{t.title}</div>
          </div>
          {t.action && (
            <button className="toast-action" onClick={() => handleAction(t)}>
              {t.action.label}
            </button>
          )}
          <button className="toast-dismiss" onClick={() => dismiss(t.id)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
