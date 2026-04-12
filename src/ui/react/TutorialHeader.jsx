import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getTutorialStorageKeys(userState) {
  const uid = userState?.uid || userState?.user?.uid || 'anonymous';

  return {
    done: `cl_tutorial_done:${uid}`,
    started: `cl_tutorial_started:${uid}`,
  };
}

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
.th-root {
  display: block;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: default;
  user-select: none;
}

.th-root.is-exiting {
  animation: th-exit 0.28s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes th-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-28px) scale(0.94);
  }
}

.th-container {
  -webkit-app-region: drag;
  width: 400px;
  box-sizing: border-box;
  padding: 24px 22px 20px;
  background: #18171ccc;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(207, 226, 255, 0.24);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.th-title {
  color: rgba(255, 255, 255, 0.95);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.th-subtitle {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 400;
  margin-top: 2px;
}

.th-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.th-step.is-pending {
  border-color: rgba(21, 98, 223, 0.38);
  background: rgba(21, 98, 223, 0.08);
}

.th-step-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.th-step-icon.done {
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #22c55e 0, #15803d 100%);
  box-shadow: 0 0 0 0.678px #166534, inset 0 0.678px #86efac;
}

.th-step-icon.pending {
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
  box-shadow: 0 0 0 0.678px #0c44a1, inset 0 0.678px #81b6ff;
}

.th-step-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.th-step-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
}

.th-step-sub {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  font-weight: 400;
}

.th-step.is-pending .th-step-sub {
  color: rgba(203, 227, 255, 0.72);
}

.th-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 0 -2px;
}

.th-actions {
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-hint {
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
  line-height: 1.4;
}

.th-cta {
  -webkit-app-region: no-drag;
  width: 100%;
  padding: 11px 0;
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
  color: #cbe3ff;
  box-shadow: 0 0 0 0.678px #0c44a1, inset 0 -1.355px #022c70, inset 0 0.678px #81b6ff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.15s ease, transform 0.15s ease;
  letter-spacing: -0.01em;
}

.th-cta:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.th-cta:active:not(:disabled) {
  opacity: 0.8;
  transform: translateY(0);
}

.th-cta:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.th-secondary {
  -webkit-app-region: no-drag;
  width: 100%;
  padding: 9px 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.th-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

body.has-glass .th-container,
body.has-glass .th-cta,
body.has-glass .th-secondary {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}
`;

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DotIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <circle cx="4" cy="4" r="3" fill="white" fillOpacity="0.9" />
  </svg>
);

function getPermissionSubtitle(permissions) {
  if (permissions.microphone === 'granted' && permissions.screen === 'granted') {
    return 'Micro et ecran autorises';
  }
  if (permissions.microphone !== 'granted' && permissions.screen !== 'granted') {
    return 'Micro et ecran a autoriser';
  }
  if (permissions.microphone !== 'granted') {
    return 'Microphone a autoriser';
  }
  return 'Ecran a autoriser';
}

export default function TutorialHeader({ continueCallback }) {
  injectStyles('tutorial-header-styles', CSS);

  const [userState, setUserState] = useState({ isLoggedIn: false });
  const [permissions, setPermissions] = useState({
    microphone: 'unknown',
    screen: 'unknown',
  });
  const [isBusy, setIsBusy] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const continueCalledRef = useRef(false);
  const tutorialKeys = useMemo(() => getTutorialStorageKeys(userState), [userState]);
  const [appStartedOnce, setAppStartedOnce] = useState(() => localStorage.getItem(tutorialKeys.started) === 'true');

  useEffect(() => {
    setAppStartedOnce(localStorage.getItem(tutorialKeys.started) === 'true');
    continueCalledRef.current = false;
    setIsExiting(false);
  }, [tutorialKeys]);

  useEffect(() => {
    if (!window.api?.headerController?.resizeHeaderWindow) return undefined;

    const enforceResize = () => {
      window.api.headerController.resizeHeaderWindow({ width: 400, height: 430 }).catch(() => {});
    };

    enforceResize();
    const timer = setTimeout(enforceResize, 120);
    return () => clearTimeout(timer);
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!window.api?.headerController?.checkSystemPermissions) return;
    try {
      const result = await window.api.headerController.checkSystemPermissions();
      setPermissions({
        microphone: result?.microphone || 'unknown',
        screen: result?.screen || 'unknown',
      });
    } catch {}
  }, []);

  useEffect(() => {
    window.api?.common?.getCurrentUser?.().then((state) => {
      setUserState(state || { isLoggedIn: false });
    }).catch(() => {});

    refreshPermissions();

    const permissionsTimer = setInterval(refreshPermissions, 1500);

    const onUserStateChanged = (_event, state) => {
      setUserState(state || { isLoggedIn: false });
      setErrorMessage('');
    };

    window.api?.common?.onUserStateChanged?.(onUserStateChanged);

    return () => {
      clearInterval(permissionsTimer);
      window.api?.common?.removeOnUserStateChanged?.(onUserStateChanged);
    };
  }, [refreshPermissions]);

  const steps = useMemo(() => {
    const connectionDone = !!userState?.isLoggedIn;
    const permissionsDone = permissions.microphone === 'granted' && permissions.screen === 'granted';

    return [
      {
        key: 'connection',
        label: 'Connexion',
        subtitle: connectionDone ? 'Compte Claire connecte' : 'Connectez votre compte Claire',
        done: connectionDone,
      },
      {
        key: 'permissions',
        label: 'Permissions',
        subtitle: getPermissionSubtitle(permissions),
        done: permissionsDone,
      },
      {
        key: 'start',
        label: 'Demarrer Claire',
        subtitle: appStartedOnce ? 'Barre flottante affichee' : 'Affichez la barre flottante pour commencer',
        done: appStartedOnce,
      },
    ];
  }, [userState, permissions, appStartedOnce]);

  const nextStep = steps.find((step) => !step.done) || null;
  const allDone = !nextStep;

  useEffect(() => {
    if (!allDone || !continueCallback || continueCalledRef.current) return;

    continueCalledRef.current = true;
    localStorage.setItem(tutorialKeys.done, 'true');
    setIsExiting(true);

    const timer = setTimeout(() => continueCallback(), 280);
    return () => clearTimeout(timer);
  }, [allDone, continueCallback, tutorialKeys]);

  const handlePrimaryAction = useCallback(async () => {
    setErrorMessage('');
    setIsBusy(true);

    try {
      if (!nextStep) {
        localStorage.setItem(tutorialKeys.done, 'true');
        setIsExiting(true);
        setTimeout(() => continueCallback?.(), 280);
        return;
      }

      if (nextStep.key === 'connection') {
        const result = await window.api?.common?.startFirebaseAuth?.();
        if (result?.success === false) {
          throw new Error(result.error || 'Connexion impossible');
        }
        return;
      }

      if (nextStep.key === 'permissions') {
        if (permissions.microphone !== 'granted') {
          const micResult = await window.api?.permissionHeader?.requestMicrophonePermission?.();
          if (micResult?.success === false) {
            throw new Error(micResult.error || 'Impossible d autoriser le microphone');
          }
        }

        if (permissions.screen !== 'granted') {
          const screenResult = await window.api?.permissionHeader?.openSystemPreferences?.('screen-recording');
          if (screenResult?.success === false) {
            throw new Error(screenResult.error || 'Impossible d ouvrir les reglages ecran');
          }
        }

        await refreshPermissions();
        return;
      }

      localStorage.setItem(tutorialKeys.started, 'true');
      setAppStartedOnce(true);
    } catch (error) {
      setErrorMessage(error?.message || 'Action impossible');
    } finally {
      setIsBusy(false);
    }
  }, [continueCallback, nextStep, permissions, refreshPermissions, tutorialKeys]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(tutorialKeys.done, 'true');
    continueCallback?.();
  }, [continueCallback, tutorialKeys]);

  const ctaLabel = useMemo(() => {
    if (!nextStep) return 'Ouvrir Claire';
    if (nextStep.key === 'connection') return 'Se connecter';
    if (nextStep.key === 'permissions') return 'Autoriser les acces';
    return 'Go';
  }, [nextStep]);

  const helperText = useMemo(() => {
    if (errorMessage) return errorMessage;
    if (!nextStep) return 'Tout est pret. Ouverture de Claire...';
    if (nextStep.key === 'connection') return 'Le navigateur va s ouvrir pour terminer la connexion.';
    if (nextStep.key === 'permissions') return 'Claire a besoin du micro et de l ecran pour fonctionner en temps reel.';
    return 'Le tuto disparait puis la barre flottante apparait.';
  }, [errorMessage, nextStep]);

  return (
    <div className={`th-root${isExiting ? ' is-exiting' : ''}`}>
      <div className="th-container">
        <div>
          <div className="th-title">Bienvenue sur Claire</div>
          <div className="th-subtitle">On termine le setup avec les vrais signaux de l app</div>
        </div>

        <div className="th-steps">
          {steps.map((step) => {
            const isPending = nextStep?.key === step.key;
            return (
              <div key={step.key} className={`th-step${isPending ? ' is-pending' : ''}`}>
                <div className={`th-step-icon ${step.done ? 'done' : 'pending'}`}>
                  {step.done ? <CheckIcon /> : <DotIcon />}
                </div>
                <div className="th-step-text">
                  <span className="th-step-label">{step.label}</span>
                  <span className="th-step-sub">{step.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="th-divider" />

        <div className="th-actions">
          <button className="th-cta" onClick={handlePrimaryAction} disabled={isBusy}>
            {isBusy ? 'Chargement...' : ctaLabel}
            {!isBusy && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {!allDone && (
            <button className="th-secondary" onClick={handleSkip} disabled={isBusy}>
              Passer pour l instant
            </button>
          )}

          <div className="th-hint">{helperText}</div>
        </div>
      </div>
    </div>
  );
}
