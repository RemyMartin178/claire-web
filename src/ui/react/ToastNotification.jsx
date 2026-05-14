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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(4px) scale(0.97); }
}

.toast-wrapper {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
}

.toast-card {
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 340px;
  pointer-events: auto !important;
  -webkit-app-region: no-drag;
  animation: toast-in 0.22s cubic-bezier(0.34, 1.1, 0.64, 1) forwards;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.07);
}

.toast-card.toast-leaving {
  animation: toast-out 0.18s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}

.toast-logo {
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 7px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.toast-logo img {
  width: 100%; height: 100%; object-fit: cover; border-radius: 7px;
}

.toast-body { flex: 1; min-width: 0; }
.toast-subtitle {
  font-size: 10px;
  color: #71717a;
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 500;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}
.toast-title {
  font-size: 12.5px;
  color: #18181b;
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.toast-dismiss {
  background: none; border: none; padding: 4px; cursor: pointer;
  color: #a1a1aa; flex-shrink: 0;
  transition: color 0.12s;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto !important;
  -webkit-app-region: no-drag;
}
.toast-dismiss:hover { color: #52525b; }

.toast-action {
  background: linear-gradient(#0544a9, #022c70);
  color: #cbe3ff;
  box-shadow: 0 0 0 0.5px #0c44a1, inset 0 -1px #022c70, inset 0 0.5px #81b6ff;
  border: none;
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-family: 'Inter', -apple-system, sans-serif;
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
