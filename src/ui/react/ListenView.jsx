import React, { useState, useEffect, useRef, useCallback } from 'react';
import SttView from './SttView.jsx';
import SummaryView from './SummaryView.jsx';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes lv-slideUp {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-150%) scale(0.85); }
}
@keyframes lv-slideDown {
  from { opacity: 0; transform: translateY(-150%) scale(0.85); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes lv-slideIn {
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.lv-root {
  display: block;
  width: 400px;
  height: 100%;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  will-change: transform, opacity;
  font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  cursor: default;
  user-select: none;
}
.lv-root.lv-hiding {
  animation: lv-slideUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}
.lv-root.lv-showing {
  animation: lv-slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.lv-root.lv-hidden {
  opacity: 0;
  transform: translateY(-150%) scale(0.85);
  pointer-events: none;
}

.lv-assistant-container {
  display: flex;
  flex-direction: column;
  color: #ffffff;
  box-sizing: border-box;
  position: relative;
  background: linear-gradient(to bottom, #18171cbf, #18171ccc);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  border-radius: 16px;
  width: 100%;
  height: 100%;
}
.lv-assistant-container::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(169deg, rgba(255,255,255,0.17) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.17) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  pointer-events: none;
}
.lv-assistant-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.15);
  border-radius: 12px;
  z-index: -1;
}

.lv-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  min-height: 36px;
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.lv-bar-left-text {
  color: rgba(255,255,255,0.88);
  font-size: 12.5px;
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.lv-bar-left-text-content {
  display: inline-block;
  transition: transform 0.3s ease;
}
.lv-bar-left-text-content.lv-slide-in {
  animation: lv-slideIn 0.3s ease forwards;
}
.lv-bar-controls {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  justify-content: flex-end;
  box-sizing: border-box;
}
.lv-toggle-button {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.65);
  outline: none;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  height: 24px;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
  justify-content: center;
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
}
.lv-toggle-button:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.90); }
.lv-toggle-button:active { transform: scale(0.96); }
.lv-toggle-button svg { flex-shrink: 0; width: 11px; height: 11px; }

.lv-copy-button {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.55);
  outline: none;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
  position: relative;
  overflow: hidden;
}
.lv-copy-button:hover { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.90); }
.lv-copy-button svg {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}
.lv-copy-button .lv-check-icon {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
}
.lv-copy-button.lv-copied .lv-copy-icon {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
}
.lv-copy-button.lv-copied .lv-check-icon {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.lv-timer {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.38);
  margin-right: 4px;
}

/* Glass mode overrides */
body.has-glass .lv-assistant-container,
body.has-glass .lv-top-bar,
body.has-glass .lv-toggle-button,
body.has-glass .lv-copy-button {
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  filter: none !important;
  backdrop-filter: none !important;
  border-radius: 0 !important;
}
body.has-glass .lv-assistant-container::before,
body.has-glass .lv-assistant-container::after {
  display: none !important;
}
body.has-glass .lv-toggle-button:hover,
body.has-glass .lv-copy-button:hover {
  background: transparent !important;
}
body.has-glass .lv-root * {
  animation: none !important;
  transition: none !important;
  transform: none !important;
  filter: none !important;
  backdrop-filter: none !important;
  box-shadow: none !important;
}
body.has-glass ::-webkit-scrollbar,
body.has-glass ::-webkit-scrollbar-track,
body.has-glass ::-webkit-scrollbar-thumb {
  background: transparent !important;
  width: 0 !important;
}
`;

export default function ListenView() {
  const [viewMode, setViewMode] = useState('insights');
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const sttViewRef = useRef(null);
  const summaryViewRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const captureStartTimeRef = useRef(null);
  const pausedElapsedSecondsRef = useRef(0);
  const copyTimeoutRef = useRef(null);
  const isThrottledRef = useRef(false);
  const adjustHeightThrottleRef = useRef(null);

  injectStyles('listen-view-styles', CSS);

  const adjustWindowHeight = useCallback(() => {
    if (!window.api) return;

    const topBar = document.querySelector('.lv-top-bar');
    const activeContent = viewMode === 'transcript'
      ? document.querySelector('.stt-transcription-container')
      : document.querySelector('.summary-insights-container');

    if (!topBar || !activeContent) return;

    const topBarHeight = topBar.offsetHeight;
    const maxContent = viewMode === 'insights' ? 460 : 600;
    const minContent = 320; // Minimum so panel isn't too small on first open
    const contentHeight = Math.min(Math.max(activeContent.scrollHeight, minContent), maxContent);
    const idealHeight = topBarHeight + contentHeight;
    const targetHeight = Math.min(700, idealHeight);

    console.log(`[ListenView Height] Mode: ${viewMode}, TopBar: ${topBarHeight}px, Content: ${contentHeight}px, Target: ${targetHeight}px`);
    
    // En mode overlay (fullscreen transparent), redimensionner le div React via événement DOM
    // au lieu de redimensionner la fenêtre OS entière.
    if (document.querySelector('.mh-root.overlay-mode') || document.body.classList.contains('has-glass')) {
      window.dispatchEvent(new CustomEvent('local-panel-resize', { 
        detail: { name: 'listen', width: 400, height: targetHeight } 
      }));
    } else {
      window.api.listenView.adjustWindowHeight(targetHeight);
    }
  }, [viewMode]);

  const adjustWindowHeightThrottled = useCallback(() => {
    if (isThrottledRef.current) return;
    adjustWindowHeight();
    isThrottledRef.current = true;
    adjustHeightThrottleRef.current = setTimeout(() => {
      isThrottledRef.current = false;
    }, 16);
  }, [adjustWindowHeight]);

  const startTimer = useCallback(() => {
    pausedElapsedSecondsRef.current = 0;
    captureStartTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - captureStartTimeRef.current) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (!timerIntervalRef.current) return;
    // Save elapsed seconds before pausing
    const elapsed = Math.floor((Date.now() - captureStartTimeRef.current) / 1000);
    pausedElapsedSecondsRef.current = elapsed;
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timerIntervalRef.current) return; // already running
    // Restart from the saved offset
    captureStartTimeRef.current = Date.now() - pausedElapsedSecondsRef.current * 1000;
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - captureStartTimeRef.current) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (!window.api) return;

    const handleSessionStateChanged = (event, { isActive }) => {
      setIsSessionActive(prev => {
        const wasActive = prev;
        if (!wasActive && isActive) {
          setHasCompletedRecording(false);
          startTimer();
          if (sttViewRef.current) sttViewRef.current.resetTranscript();
          if (summaryViewRef.current) summaryViewRef.current.resetAnalysis();
        }
        if (wasActive && !isActive) {
          setHasCompletedRecording(true);
          setIsPaused(false);
          pausedElapsedSecondsRef.current = 0;
          stopTimer();
          // Collapse panel back to top bar only (~44px)
          setTimeout(() => {
            if (document.querySelector('.mh-root.overlay-mode') || document.body.classList.contains('has-glass')) {
              window.dispatchEvent(new CustomEvent('local-panel-resize', { detail: { name: 'listen', width: 400, height: 44 } }));
            } else if (window.api) {
              window.api.listenView.adjustWindowHeight(44);
            }
          }, 80);
        }
        return isActive;
      });
    };

    const handlePauseStateChanged = (event, { isPaused: paused }) => {
      if (paused) {
        pauseTimer();
      } else {
        resumeTimer();
      }
    };

    window.api.listenView.onSessionStateChanged(handleSessionStateChanged);
    window.api.listenView.onPauseStateChanged(handlePauseStateChanged);

    const handleUserStateChanged = (_event, userState) => {
      if (!userState?.isLoggedIn) {
        window.dispatchEvent(new CustomEvent('local-panel-close', { detail: { name: 'listen' } }));
      }
    };
    window.api?.common?.onUserStateChanged?.(handleUserStateChanged);

    return () => {
      stopTimer();
      if (adjustHeightThrottleRef.current) clearTimeout(adjustHeightThrottleRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      window.api?.common?.removeOnUserStateChanged?.(handleUserStateChanged);
    };
  }, [startTimer, stopTimer, pauseTimer, resumeTimer]);

  useEffect(() => {
    adjustWindowHeight();
  }, [viewMode, adjustWindowHeight]);

  useEffect(() => {
    const timer = setTimeout(() => adjustWindowHeight(), 200);
    return () => clearTimeout(timer);
  }, [adjustWindowHeight]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'insights' ? 'transcript' : 'insights');
  }, []);

  const handleCopyHover = useCallback((hovering) => {
    setIsHovering(hovering);
    setIsAnimating(hovering);
  }, []);

  const handleCopy = useCallback(async () => {
    if (copyState === 'copied') return;

    let textToCopy = '';
    if (viewMode === 'transcript') {
      textToCopy = sttViewRef.current ? sttViewRef.current.getTranscriptText() : '';
    } else {
      textToCopy = summaryViewRef.current ? summaryViewRef.current.getSummaryText() : '';
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyState('copied');
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopyState('idle');
      }, 1500);
    } catch (err) {
      console.error('[ListenView] Failed to copy:', err);
    }
  }, [copyState, viewMode]);

  const handleSttMessagesUpdated = useCallback(() => {
    adjustWindowHeightThrottled();
  }, [adjustWindowHeightThrottled]);

  const displayText = isHovering
    ? viewMode === 'transcript'
      ? 'Copier la transcription'
      : "Copier l'analyse"
    : viewMode === 'insights'
    ? 'Analyses en direct'
    : isPaused
    ? `En pause — ${elapsedTime}`
    : `Claire écoute ${elapsedTime}`;

  const handleClose = useCallback(() => {
    window.dispatchEvent(new CustomEvent('local-panel-close', { detail: { name: 'listen' } }));
  }, []);

  return (
    <div className="lv-root">
      <div className="lv-assistant-container">
        <div className="lv-top-bar">
          <div className="lv-bar-left-text">
            <span className={`lv-bar-left-text-content${isAnimating ? ' lv-slide-in' : ''}`}>
              {displayText}
            </span>
          </div>
          <div className="lv-bar-controls">
            <button className="lv-toggle-button" onClick={toggleViewMode}>
              {viewMode === 'insights' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Afficher la transcription</span>
                </>
              ) : (
                <>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M22 12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  <span>Afficher les analyses</span>
                </>
              )}
            </button>
            <button
              className={`lv-copy-button${copyState === 'copied' ? ' lv-copied' : ''}`}
              onClick={handleCopy}
              onMouseEnter={() => handleCopyHover(true)}
              onMouseLeave={() => handleCopyHover(false)}
            >
              <svg className="lv-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <svg className="lv-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hide content panel once session ends — floating bar returns to minimal state */}
        {isSessionActive && (
          <>
            <SttView
              ref={sttViewRef}
              isVisible={viewMode === 'transcript'}
              onMessagesUpdated={handleSttMessagesUpdated}
            />

            <SummaryView
              ref={summaryViewRef}
              isVisible={viewMode === 'insights'}
              hasCompletedRecording={hasCompletedRecording}
            />
          </>
        )}
      </div>
    </div>
  );
}
