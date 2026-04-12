import React, { useState, useEffect, useCallback } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
* { font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: default; user-select: none; box-sizing: border-box; }

.ssv-root { display: flex; width: 100%; height: 100%; color: var(--text-primary, #1f2937); }

.ssv-container {
  display: flex; flex-direction: column; height: 100%;
  background: var(--surface-elevated, #ffffff); border-radius: 12px;
  border: 1px solid var(--border-light, #e5e7eb);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  position: relative; overflow: hidden; padding: 12px; width: 100%;
}

.ssv-close-button {
  position: absolute; top: 10px; right: 10px; width: 14px; height: 14px;
  background: var(--background-secondary, #f8f9fa); border: none; border-radius: 3px;
  color: var(--text-secondary, #6b7280); display: grid; place-items: center;
  font-size: 14px; line-height: 0; cursor: pointer; transition: .15s; z-index: 10;
}
.ssv-close-button:hover { background: var(--background-tertiary, #f1f3f4); color: var(--text-primary, #1f2937); }

.ssv-title {
  font-size: 14px; font-weight: 500; margin: 0 0 8px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light, #e5e7eb); text-align: center;
  color: var(--text-primary, #1f2937);
}

.ssv-scroll-area { flex: 1 1 auto; overflow-y: auto; margin: 0 -4px; padding: 4px; }

.ssv-shortcut-entry { display: flex; align-items: center; width: 100%; gap: 8px; margin-bottom: 8px; font-size: 12px; padding: 4px; }
.ssv-shortcut-name { flex: 1 1 auto; color: var(--text-primary, #1f2937); font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ssv-action-btn { background: none; border: none; color: var(--interactive-primary, #2563eb); font-size: 11px; padding: 0 4px; cursor: pointer; transition: .15s; }
.ssv-action-btn:hover { color: var(--interactive-primary-hover, #1d4ed8); text-decoration: underline; }

.ssv-shortcut-input {
  width: 120px; background: var(--background-secondary, #f8f9fa);
  border: 1px solid var(--border-medium, #d1d5db); border-radius: 4px;
  padding: 4px 6px; font: 11px 'SF Mono','Menlo', monospace;
  color: var(--text-primary, #1f2937); text-align: right; cursor: text; margin-left: auto;
}
.ssv-shortcut-input:focus, .ssv-shortcut-input.ssv-capturing {
  outline: none; border-color: var(--interactive-primary, #2563eb);
  box-shadow: 0 0 0 1px var(--interactive-primary-light, #dbeafe);
}

.ssv-feedback { font-size: 10px; margin-top: 2px; min-height: 12px; }
.ssv-feedback.error { color: #ef4444; }
.ssv-feedback.success { color: #22c55e; }

.ssv-actions { display: flex; gap: 4px; padding-top: 8px; border-top: 1px solid var(--border-light, #e5e7eb); }
.ssv-btn {
  flex: 1; background: var(--background-secondary, #f8f9fa);
  border: 1px solid var(--border-medium, #d1d5db); border-radius: 4px;
  color: var(--text-primary, #1f2937); padding: 5px 10px; font-size: 11px; cursor: pointer; transition: .15s;
}
.ssv-btn:hover { background: var(--background-tertiary, #f1f3f4); }
.ssv-btn.primary { background: var(--interactive-primary, #2563eb); border-color: var(--interactive-primary, #2563eb); color: white; }
.ssv-btn.primary:hover { background: var(--interactive-primary-hover, #1d4ed8); }
.ssv-btn.danger { background: var(--danger-light, #fee2e2); border-color: var(--danger, #dc2626); color: var(--danger, #dc2626); }
.ssv-btn.danger:hover { background: var(--danger-lighter, #fef2f2); }

.ssv-loading { padding: 16px; text-align: center; color: var(--text-secondary, #6b7280); font-size: 13px; }

.ssv-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
}
.ssv-modal {
  background: white; padding: 20px; border-radius: 12px; max-width: 100%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.ssv-modal h2 { font-size: 16px; margin: 0 0 10px; font-weight: 600; }
.ssv-modal p { font-size: 13px; color: #4b5563; margin: 0 0 20px; }
.ssv-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
`;

const commonSystemShortcuts = new Set([
  'Cmd+Q', 'Cmd+W', 'Cmd+A', 'Cmd+S', 'Cmd+Z', 'Cmd+X', 'Cmd+C', 'Cmd+V', 'Cmd+P', 'Cmd+F', 'Cmd+G', 'Cmd+H', 'Cmd+M', 'Cmd+N', 'Cmd+O', 'Cmd+T',
  'Ctrl+Q', 'Ctrl+W', 'Ctrl+A', 'Ctrl+S', 'Ctrl+Z', 'Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+P', 'Ctrl+F', 'Ctrl+G', 'Ctrl+H', 'Ctrl+M', 'Ctrl+N', 'Ctrl+O', 'Ctrl+T'
]);

const displayNameMap = {
  nextStep: 'Ask Anything',
  moveUp: 'Move Up Window',
  moveDown: 'Move Down Window',
  scrollUp: 'Scroll Up Response',
  scrollDown: 'Scroll Down Response',
};

function formatShortcutName(name) {
  if (displayNameMap[name]) return displayNameMap[name];
  const result = name.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function parseAccelerator(e) {
  const parts = [];
  if (e.metaKey) parts.push('Cmd');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  const isModifier = ['Meta', 'Control', 'Alt', 'Shift'].includes(e.key);
  if (isModifier) return null;

  const map = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', ' ': 'Space' };
  parts.push(e.key.length === 1 ? e.key.toUpperCase() : (map[e.key] || e.key));
  const accel = parts.join('+');

  if (parts.length === 1) return { error: 'Invalid shortcut: needs a modifier' };
  if (parts.length > 4) return { error: 'Invalid shortcut: max 4 keys' };
  if (commonSystemShortcuts.has(accel)) return { error: 'Invalid shortcut: system reserved' };
  return { accel };
}

export default function ShortcutSettingsView() {
  const [shortcuts, setShortcuts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [capturingKey, setCapturingKey] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [modal, setModal] = useState(null); // { title, message, onConfirm }

  injectStyles('shortcut-settings-view-styles', CSS);

  useEffect(() => {
    if (!window.api) return;

    const handler = (event, keybinds) => {
      setShortcuts(keybinds);
      setIsLoading(false);
    };

    window.api.shortcutSettingsView.onLoadShortcuts(handler);
    return () => {
      window.api.shortcutSettingsView.removeOnLoadShortcuts(handler);
    };
  }, []);

  const handleKeydown = useCallback((e, shortcutKey) => {
    e.preventDefault();
    e.stopPropagation();
    const result = parseAccelerator(e);
    if (!result) return;

    const { accel, error } = result;
    if (error) {
      setFeedback(prev => ({ ...prev, [shortcutKey]: { type: 'error', msg: error } }));
      return;
    }
    setShortcuts(prev => ({ ...prev, [shortcutKey]: accel }));
    setFeedback(prev => ({ ...prev, [shortcutKey]: { type: 'success', msg: 'Shortcut set' } }));
    setCapturingKey(null);
  }, []);

  const startCapture = useCallback((key) => {
    setCapturingKey(key);
    setFeedback(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const disableShortcut = useCallback((key) => {
    setShortcuts(prev => ({ ...prev, [key]: '' }));
    setFeedback(prev => ({ ...prev, [key]: { type: 'success', msg: 'Shortcut disabled' } }));
  }, []);

  const stopCapture = useCallback(() => {
    setCapturingKey(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!window.api) return;
    setFeedback({});
    const result = await window.api.shortcutSettingsView.saveShortcuts(shortcuts);
    if (!result.success) {
      setModal({ title: 'Erreur', message: "Échec de l'enregistrement : " + result.error, onConfirm: null });
    } else {
      setFeedback({ global: { type: 'success', msg: 'Raccourcis enregistrés avec succès' } });
    }
  }, [shortcuts]);

  const handleClose = useCallback(() => {
    if (!window.api) return;
    setFeedback({});
    window.api.shortcutSettingsView.closeShortcutSettingsWindow();
  }, []);

  const handleResetToDefault = useCallback(() => {
    setModal({
      title: 'Réinitialisation',
      message: 'Êtes-vous sûr de vouloir réinitialiser tous les raccourcis aux valeurs par défaut ?',
      onConfirm: async () => {
        try {
          const defaultShortcuts = await window.api.shortcutSettingsView.getDefaultShortcuts();
          setShortcuts(defaultShortcuts);
        } catch (error) {
          setModal({ title: 'Erreur', message: 'Échec du chargement des paramètres par défaut.', onConfirm: null });
        }
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="ssv-root">
        <div className="ssv-container">
          <div className="ssv-loading">Chargement des raccourcis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ssv-root">
      <div className="ssv-container">
        <button className="ssv-close-button" onClick={handleClose} title="Fermer">&times;</button>
        <h1 className="ssv-title">Modifier les raccourcis</h1>

        <div className="ssv-scroll-area">
          {Object.keys(shortcuts).map(key => (
            <div key={key}>
              <div className="ssv-shortcut-entry">
                <span className="ssv-shortcut-name">{formatShortcutName(key)}</span>
                <button className="ssv-action-btn" onClick={() => startCapture(key)}>Modifier</button>
                <button className="ssv-action-btn" onClick={() => disableShortcut(key)}>Désactiver</button>
                <input
                  readOnly
                  className={`ssv-shortcut-input${capturingKey === key ? ' ssv-capturing' : ''}`}
                  value={shortcuts[key] || ''}
                  placeholder={capturingKey === key ? 'Nouveau raccourci…' : 'Modifier'}
                  onClick={() => startCapture(key)}
                  onKeyDown={(e) => handleKeydown(e, key)}
                  onBlur={() => stopCapture()}
                  onChange={() => {}}
                />
              </div>
              {feedback[key] ? (
                <div className={`ssv-feedback ${feedback[key].type}`}>{feedback[key].msg}</div>
              ) : (
                <div className="ssv-feedback" />
              )}
            </div>
          ))}
          {feedback.global && (
            <div className="ssv-feedback success" style={{ textAlign: 'center', padding: '5px' }}>
              {feedback.global.msg}
            </div>
          )}
        </div>

        <div className="ssv-actions">
          <button className="ssv-btn" onClick={handleClose}>Annuler</button>
          <button className="ssv-btn danger" onClick={handleResetToDefault}>Réinitialiser</button>
          <button className="ssv-btn primary" onClick={handleSave}>Enregistrer</button>
        </div>

        {modal && (
          <div className="ssv-modal-overlay">
            <div className="ssv-modal">
              <h2>{modal.title}</h2>
              <p>{modal.message}</p>
              <div className="ssv-modal-actions">
                <button className="ssv-btn" onClick={() => setModal(null)}>
                  {modal.onConfirm ? 'Annuler' : 'Ok'}
                </button>
                {modal.onConfirm && (
                  <button className="ssv-btn primary" onClick={() => { modal.onConfirm(); setModal(null); }}>
                    Confirmer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
