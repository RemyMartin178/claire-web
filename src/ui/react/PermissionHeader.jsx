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
@keyframes ph-slideOut {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-100%); opacity: 0; }
}

.ph-root {
  display: block;
  transition: opacity 0.3s ease-in, transform 0.3s ease-in;
  will-change: opacity, transform;
  font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  cursor: default; user-select: none;
}
.ph-root.ph-sliding-out { animation: ph-slideOut 0.3s ease-in-out forwards; }
.ph-root.ph-hidden { opacity: 0; pointer-events: none; }

.ph-container {
  -webkit-app-region: drag;
  width: 285px;
  height: 220px;
  padding: 18px 20px;
  background: rgba(0,0,0,0.3);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ph-container::after {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 16px; padding: 1px;
  background: linear-gradient(169deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.5) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out; mask-composite: exclude; pointer-events: none;
}

.ph-close-button {
  -webkit-app-region: no-drag;
  position: absolute; top: 10px; right: 10px;
  width: 14px; height: 14px;
  background: rgba(255,255,255,0.1); border: none; border-radius: 3px;
  color: rgba(255,255,255,0.7); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease; z-index: 10; font-size: 14px; line-height: 1; padding: 0;
}
.ph-close-button:hover { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); }
.ph-close-button:active { transform: scale(0.95); }

.ph-title { color: white; font-size: 16px; font-weight: 500; margin: 0; text-align: center; flex-shrink: 0; }

.ph-form-content { display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: auto; }

.ph-subtitle { color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 400; text-align: center; margin-bottom: 12px; line-height: 1.3; }

.ph-permission-status { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; min-height: 20px; }
.ph-permission-item { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 400; }
.ph-permission-item.ph-granted { color: rgba(34,197,94,0.9); }
.ph-permission-icon { width: 12px; height: 12px; opacity: 0.8; }
.ph-check-icon { width: 12px; height: 12px; color: rgba(34,197,94,0.9); }

.ph-action-button {
  -webkit-app-region: no-drag;
  width: 100%; height: 34px;
  background: rgba(255,255,255,0.2); border: none; border-radius: 10px;
  color: white; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background 0.15s ease; position: relative; overflow: hidden; margin-bottom: 6px;
  font-family: inherit;
}
.ph-action-button::after {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 10px; padding: 1px;
  background: linear-gradient(169deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.5) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out; mask-composite: exclude; pointer-events: none;
}
.ph-action-button:hover:not(:disabled) { background: rgba(255,255,255,0.3); }
.ph-action-button:disabled { opacity: 0.5; cursor: not-allowed; }

.ph-continue-button {
  -webkit-app-region: no-drag;
  width: 100%; height: 34px;
  background: rgba(34,197,94,0.8); border: none; border-radius: 10px;
  color: white; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background 0.15s ease; position: relative; overflow: hidden; margin-top: 4px;
  font-family: inherit;
}
.ph-continue-button::after {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 10px; padding: 1px;
  background: linear-gradient(169deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.5) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out; mask-composite: exclude; pointer-events: none;
}
.ph-continue-button:hover:not(:disabled) { background: rgba(34,197,94,0.9); }
.ph-continue-button:disabled { background: rgba(255,255,255,0.2); cursor: not-allowed; }

body.has-glass .ph-container,
body.has-glass .ph-action-button,
body.has-glass .ph-continue-button,
body.has-glass .ph-close-button {
  background: transparent !important; border: none !important;
  box-shadow: none !important; filter: none !important; backdrop-filter: none !important;
}
body.has-glass .ph-container::after,
body.has-glass .ph-action-button::after,
body.has-glass .ph-continue-button::after { display: none !important; }
body.has-glass .ph-action-button:hover,
body.has-glass .ph-continue-button:hover,
body.has-glass .ph-close-button:hover { background: transparent !important; }
`;

export default function PermissionHeader({ continueCallback }) {
  const [microphoneGranted, setMicrophoneGranted] = useState('unknown');
  const [screenGranted, setScreenGranted] = useState('unknown');
  const [isChecking, setIsChecking] = useState(false);
  const continueCalledRef = useRef(false);

  injectStyles('permission-header-styles', CSS);

  const checkPermissions = useCallback(async () => {
    if (!window.api || isChecking) return;
    setIsChecking(true);
    try {
      const permissions = await window.api.permissionHeader.checkSystemPermissions();
      setMicrophoneGranted(prev => {
        if (prev !== permissions.microphone) return permissions.microphone;
        return prev;
      });
      setScreenGranted(prev => {
        if (prev !== permissions.screen) return permissions.screen;
        return prev;
      });
    } catch (error) {
      console.error('[PermissionHeader] Error checking permissions:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    checkPermissions();
    const interval = setInterval(() => checkPermissions(), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      microphoneGranted === 'granted' &&
      screenGranted === 'granted' &&
      continueCallback &&
      !continueCalledRef.current
    ) {
      continueCalledRef.current = true;
      setTimeout(() => handleContinue(), 500);
    }
  }, [microphoneGranted, screenGranted]);

  const handleContinue = useCallback(async () => {
    if (continueCallback && microphoneGranted === 'granted' && screenGranted === 'granted') {
      if (window.api) {
        try {
          await window.api.permissionHeader.markPermissionsCompleted();
        } catch (error) {
          console.error('[PermissionHeader] Error marking permissions as completed:', error);
        }
      }
      continueCallback();
    }
  }, [continueCallback, microphoneGranted, screenGranted]);

  const handleMicrophoneClick = useCallback(async () => {
    if (!window.api || microphoneGranted === 'granted') return;
    try {
      const result = await window.api.permissionHeader.checkSystemPermissions();
      if (result.microphone === 'granted') {
        setMicrophoneGranted('granted');
        return;
      }
      if (['not-determined', 'denied', 'unknown', 'restricted'].includes(result.microphone)) {
        const res = await window.api.permissionHeader.requestMicrophonePermission();
        if (res.status === 'granted' || res.success === true) {
          setMicrophoneGranted('granted');
        }
      }
    } catch (error) {
      console.error('[PermissionHeader] Error requesting microphone permission:', error);
    }
  }, [microphoneGranted]);

  const handleScreenClick = useCallback(async () => {
    if (!window.api || screenGranted === 'granted') return;
    try {
      const permissions = await window.api.permissionHeader.checkSystemPermissions();
      if (permissions.screen === 'granted') {
        setScreenGranted('granted');
        return;
      }
      if (['not-determined', 'denied', 'unknown', 'restricted'].includes(permissions.screen)) {
        await window.api.permissionHeader.openSystemPreferences('screen-recording');
      }
    } catch (error) {
      console.error('[PermissionHeader] Error opening screen recording preferences:', error);
    }
  }, [screenGranted]);

  const handleClose = useCallback(() => {
    if (window.api) {
      window.api.common.quitApplication();
    }
  }, []);

  const allGranted = microphoneGranted === 'granted' && screenGranted === 'granted';

  return (
    <div className="ph-root">
      <div className="ph-container">
        <button className="ph-close-button" onClick={handleClose} title="Close application">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <h1 className="ph-title">Permission Setup Required</h1>

        <div className="ph-form-content">
          <div className="ph-subtitle">Grant access to microphone and screen recording to continue</div>

          <div className="ph-permission-status">
            <div className={`ph-permission-item${microphoneGranted === 'granted' ? ' ph-granted' : ''}`}>
              {microphoneGranted === 'granted' ? (
                <>
                  <svg className="ph-check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Microphone [OK]</span>
                </>
              ) : (
                <>
                  <svg className="ph-permission-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  <span>Microphone</span>
                </>
              )}
            </div>

            <div className={`ph-permission-item${screenGranted === 'granted' ? ' ph-granted' : ''}`}>
              {screenGranted === 'granted' ? (
                <>
                  <svg className="ph-check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Screen [OK]</span>
                </>
              ) : (
                <>
                  <svg className="ph-permission-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  </svg>
                  <span>Screen Recording</span>
                </>
              )}
            </div>
          </div>

          {microphoneGranted !== 'granted' && (
            <button className="ph-action-button" onClick={handleMicrophoneClick}>
              Grant Microphone Access
            </button>
          )}

          {screenGranted !== 'granted' && (
            <button className="ph-action-button" onClick={handleScreenClick}>
              Grant Screen Recording Access
            </button>
          )}

          {allGranted && (
            <button className="ph-continue-button" onClick={handleContinue}>
              Continue to Pickle Glass
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
