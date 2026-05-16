import React, { useCallback, useEffect, useRef, useState } from 'react';
import CluelyThreadViewport from './CluelyThreadViewport.jsx';
import CluelyComposer from './CluelyComposer.jsx';
import CluelyQuickActions from './CluelyQuickActions.jsx';

// The renderer bundler doesn't pick up `import './*.css'` for files in this
// directory — every other panel uses inline `injectStyles(id, CSS_STRING)`.
// We mirror that pattern so the glass background, layout and animations
// actually reach the DOM at runtime.
const CLUELY_ASK_CSS = `
.cluely-ask-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 168px;
  overflow: hidden;
  border-radius: 16px;
  /* Cluely glass: gradient bg + thin border + multi-layer shadow + heavy blur. */
  border: 1px solid rgba(207, 226, 255, 0.10);
  background: linear-gradient(180deg, rgba(18, 19, 23, 0.90), rgba(10, 11, 14, 0.88));
  color: rgba(255, 255, 255, 0.90);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.52),
    0 0 0 0.5px rgba(255, 255, 255, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(28px) saturate(175%);
  -webkit-backdrop-filter: blur(28px) saturate(175%);
  /* Match Cluely (index-BPsiDjLU.css): --default-font-family: "Geist Variable", sans-serif */
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.cluely-ask-root * { font-family: inherit; }

/* ── Viewed screen preview (portal'd to document.body) ─────────────────── */
.cluely-viewed-preview-portal {
  position: fixed;
  z-index: 2147483647;
  width: max-content;
  max-width: calc(100vw - 24px);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(13, 14, 17, 0.96);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.60),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  pointer-events: auto;
  animation: cluely-preview-in 160ms ease-out both;
}
@keyframes cluely-preview-in {
  from { opacity: 0; transform: translateY(-4px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cluely-viewed-loading,
.cluely-viewed-error {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}
.cluely-viewed-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.16);
  border-top-color: rgba(255, 255, 255, 0.72);
  border-radius: 9999px;
  animation: cluely-spin 700ms linear infinite;
}
@keyframes cluely-spin { to { transform: rotate(360deg); } }

.cluely-thread {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  background: transparent;
}
.cluely-thread-viewport {
  position: relative;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-left: 6px;
  padding-right: 6px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(
    to bottom,
    black 0%,
    black calc(100% - var(--viewport-bottom-mask-size, 0px)),
    transparent 100%
  );
}
.cluely-thread-viewport::-webkit-scrollbar { width: 0; height: 0; display: none; }

.cluely-user-row {
  display: flex;
  justify-content: flex-end;
  padding: 6px 8px 20px 8px;
}
.cluely-user-bubble-wrap {
  position: relative;
  max-width: 70%;
  cursor: default;
  user-select: text;
}
.cluely-user-bubble {
  position: relative;
  padding: 6px 10px;
  border-radius: 11px 11px 4px 11px;
  background: linear-gradient(#0544a9, #022c70);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  line-height: 1.45;
  box-shadow:
    0 6px 14px rgba(0, 0, 0, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.16),
    0 0 0 0.5px #0c44a1,
    inset 0 -1px #022c70,
    inset 0 0.5px #81b6ff;
}
.cluely-user-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.cluely-assistant-row {
  padding: 0 12px 14px 12px;
  /* No content-visibility:auto / contain-intrinsic-size here — they clip
     absolutely-positioned children (the screenshot preview) when they extend
     beyond the row's intrinsic size, producing the "Viewed screen cut in half" bug. */
}
.cluely-assistant-content {
  cursor: default;
  user-select: text;
  font-size: 13px;
  line-height: 1.58;
  color: rgba(255, 255, 255, 0.86);
}
.cluely-assistant-content p { margin: 0 0 8px 0; }
.cluely-assistant-content p:last-child { margin-bottom: 0; }
.cluely-assistant-content code {
  background: rgba(255, 255, 255, 0.07);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
}
.cluely-assistant-content pre {
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

.cluely-viewed-label {
  margin: 0 0 4px 0;
  width: fit-content;
  color: rgba(255, 255, 255, 0.46);
  font-size: 12px;
  line-height: 1;
  cursor: default;
  transition: color 150ms ease;
}
.cluely-viewed-label:hover { color: rgba(255, 255, 255, 0.74); }
.cluely-viewed-image-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
}
.cluely-viewed-image-wrap.loading { width: 320px; aspect-ratio: 16 / 9; }
.cluely-viewed-image-wrap.loaded { width: fit-content; }
.cluely-viewed-img { width: 320px; object-fit: contain; transition: opacity 150ms ease; }
.cluely-viewed-img.visible { height: auto; max-height: 320px; opacity: 1; }
.cluely-viewed-img.hidden { width: 320px; height: 100%; opacity: 0; }
/* loading/error/spinner are defined above (in the preview-portal block) */

@keyframes cluely-loading-dot {
  0%, 42.5% { opacity: 1; }
  50%, 92.5% { opacity: 0; }
  100% { opacity: 1; }
}
.cluely-loading-dot {
  margin-top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.90);
  animation: cluely-loading-dot 1s linear infinite;
}

.cluely-copy-btn {
  margin-top: 4px;
  margin-left: -2px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.38);
  opacity: 0;
  transform: scale(0.88);
  cursor: pointer;
  transition: opacity 160ms ease-out, transform 160ms ease-out, background-color 150ms ease, color 150ms ease;
}
.cluely-assistant-row:hover .cluely-copy-btn,
.cluely-user-row:hover .cluely-copy-btn {
  opacity: 1;
  transform: scale(1);
}
.cluely-copy-btn:hover { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.74); }
.cluely-copy-btn:active { transform: scale(0.96); }

.cluely-actions {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 10px 2px 10px;
  overflow: hidden;
}
.cluely-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.80);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms ease, color 120ms ease, transform 120ms ease;
}
.cluely-action-btn:hover { background: rgba(255, 255, 255, 0.13); color: rgba(255, 255, 255, 0.96); }
.cluely-action-btn:disabled { opacity: 0.50; cursor: default; }
.cluely-action-dot {
  width: 3px;
  height: 3px;
  margin: 0 3px;
  flex: 0 0 auto;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.22);
}

.cluely-composer {
  margin: auto 10px 10px 10px;
  /* When blurred (no chip/dots), composer is just the textarea line ~40px. */
  min-height: 40px;
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: min-height 220ms cubic-bezier(0.34, 1.3, 0.64, 1),
              border-color 150ms ease,
              box-shadow 150ms ease;
}
.cluely-composer.is-focused {
  min-height: 80px;
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.04),
    0 0 0 0.5px rgba(255, 255, 255, 0.04);
}
.cluely-textarea-wrap { position: relative; display: flex; align-items: flex-start; }
.cluely-textarea {
  display: block;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  padding: 10px 44px 10px 10px;
  max-height: 50px;
  overflow-y: hidden;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  font-family: inherit;
  /* Kill all browser-default focus/selection artefacts that produce the
     "trait sous l'input à chaque frappe" bug — outlines, focus rings, tap
     highlights, caret-induced relayout shadows. */
  scrollbar-width: none;
  -ms-overflow-style: none;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent;
}
.cluely-textarea::-webkit-scrollbar { width: 0; height: 0; display: none; }
.cluely-textarea:focus,
.cluely-textarea:focus-visible,
.cluely-textarea:active {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.cluely-textarea::placeholder { color: rgba(255, 255, 255, 0.38); }
.cluely-send-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: linear-gradient(#0544a9, #022c70);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 0.5px #0c44a1, inset 0 -1px #022c70, inset 0 0.5px #81b6ff;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
}
.cluely-send-btn:hover { transform: scale(1.05); filter: brightness(1.18); }
.cluely-send-btn:active { transform: scale(0.94); }
.cluely-send-btn:disabled { opacity: 0.50; cursor: default; filter: grayscale(0.4); }

/* Smart chip + more btn — toggle with .focused / .blurred class on footer.
   Blurred: stay barely visible + slightly translated down (Cluely keeps the
   chip discoverable, doesn't fully hide it). */
.cluely-composer-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 8px 10px;
  overflow: hidden;
  transition: opacity 160ms ease,
              transform 160ms cubic-bezier(0.34, 1.3, 0.64, 1),
              max-height 220ms cubic-bezier(0.34, 1.3, 0.64, 1),
              padding 160ms ease;
}
.cluely-composer-footer.focused {
  opacity: 1;
  transform: translateY(0);
  max-height: 36px;
}
.cluely-composer-footer.blurred {
  opacity: 0;
  transform: translateY(6px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  pointer-events: none;
}

/* Quick-action "pulse" — runs when a quick action writes into the textarea. */
@keyframes cluely-composer-pulse {
  0%   { transform: translateY(3px) scale(0.992); opacity: 0.72; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
.cluely-textarea.pulse {
  animation: cluely-composer-pulse 150ms ease-out both;
}
.cluely-smart-chip {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.70);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
}
.cluely-smart-chip:hover { background: rgba(255, 255, 255, 0.20); color: #fff; transform: scale(1.04); }
.cluely-smart-chip.active { background: rgba(255, 193, 7, 0.22); color: #ffd54a; }
.cluely-more-btn {
  display: inline-flex;
  width: 28px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.50);
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease, transform 120ms ease;
}
.cluely-more-btn:hover { color: rgba(255, 255, 255, 0.88); background: rgba(255, 255, 255, 0.08); }

.cluely-scroll-bottom-wrap {
  pointer-events: none;
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding-right: 14px;
  padding-bottom: 12px;
}
.cluely-scroll-bottom {
  pointer-events: auto;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: linear-gradient(#2e3039, #272a31);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  box-shadow:
    0 85px 34px #00000005,
    0 48px 29px #00000014,
    0 21px 21px #00000021,
    0 5px 12px #00000029,
    inset 0 -1px #16171a,
    inset 0 0.5px #afb3c4;
  transition: opacity 160ms ease, transform 160ms ease, filter 150ms ease;
}
.cluely-scroll-bottom:hover { transform: scale(1.05); filter: brightness(1.25); }
`;

function injectCluelyAskStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cluely-ask-styles')) return;
  const s = document.createElement('style');
  s.id = 'cluely-ask-styles';
  s.textContent = CLUELY_ASK_CSS;
  document.head.appendChild(s);
}

let _msgIdCounter = 0;
const nextId = () => `m_${Date.now()}_${++_msgIdCounter}`;

/**
 * CluelyAskView — owns the message list and bridges window.api.askView state
 * updates (streaming tokens, screenshot metadata, completion) into the
 * conversational UI shape Cluely uses.
 */
export default function CluelyAskView() {
  injectCluelyAskStyles();

  const [messages, setMessages] = useState([]);
  const [smartMode, setSmartMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const rootRef = useRef(null);
  const composerRef = useRef(null);
  const streamingMsgIdRef = useRef(null);
  const lastStateRef = useRef({
    currentQuestion: '',
    currentResponse: '',
    isStreaming: false,
    isLoading: false,
  });

  // Auto-resize the overlay panel to fit the conversation height (clamped to
  // [CLUELY_ASK_MIN_HEIGHT, CLUELY_ASK_MAX_HEIGHT]). We measure thread content
  // + actions + composer and dispatch `local-panel-resize`, the same event the
  // overlay root listens to.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ASK_WIDTH = 660;
    const ASK_MIN = 168;
    const ASK_MAX = 700;

    let lastH = 0;
    let raf = 0;

    const recompute = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const viewport = root.querySelector('.cluely-thread-viewport');
        const actions = root.querySelector('.cluely-actions');
        const composer = root.querySelector('.cluely-composer');
        const viewportH = viewport ? viewport.scrollHeight : 0;
        const actionsH = actions ? actions.getBoundingClientRect().height : 32;
        const composerH = composer ? composer.getBoundingClientRect().height : 88;
        const desired = Math.ceil(viewportH + actionsH + composerH + 12);
        const clamped = Math.max(ASK_MIN, Math.min(ASK_MAX, desired));
        if (Math.abs(clamped - lastH) > 3) {
          lastH = clamped;
          window.dispatchEvent(
            new CustomEvent('local-panel-resize', {
              detail: { name: 'ask', width: ASK_WIDTH, height: clamped },
            })
          );
          // Re-pin to bottom after the panel resizes — the resize itself can
          // shift scrollTop out from under us, especially during streaming.
          requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('cluely-ask:scroll-bottom'));
          });
        }
      });
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(root);
    const viewport = root.querySelector('.cluely-thread-viewport');
    if (viewport) ro.observe(viewport);

    const mo = new MutationObserver(recompute);
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!window.api?.askView?.onAskStateUpdate) return;

    // Buffer rapid token updates into a single rAF — keeps the UI silky-smooth
    // even when the backend broadcasts dozens of tokens per second.
    let pendingState = null;
    let rafId = 0;

    const applyState = (state) => {
      const prev = lastStateRef.current;

      const newQuestionStarted =
        state.isLoading &&
        state.currentQuestion &&
        state.currentQuestion !== prev.currentQuestion;

      if (newQuestionStarted) {
        const userMsg = {
          id: nextId(),
          role: 'user',
          text: state.currentQuestion,
          metadata: { userDisplayText: state.currentQuestion },
        };
        const assistantId = nextId();
        const assistantMsg = {
          id: assistantId,
          role: 'assistant',
          status: 'running',
          text: '',
          html: '',
          metadata: state.currentMessageMetadata || null,
        };
        streamingMsgIdRef.current = assistantId;
        setMessages((curr) => [...curr, userMsg, assistantMsg]);
        setIsStreaming(true);
        // Force scroll-to-bottom both immediately and on next frame, so the
        // new user message + assistant placeholder don't end up above the fold.
        window.dispatchEvent(new CustomEvent('cluely-ask:scroll-bottom'));
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('cluely-ask:scroll-bottom'));
        });
      }

      if (state.isStreaming || state.currentResponse !== prev.currentResponse) {
        const assistantId = streamingMsgIdRef.current;
        if (assistantId) {
          setMessages((curr) =>
            curr.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    text: state.currentResponse || '',
                    status: state.isStreaming ? 'running' : 'done',
                    metadata: state.currentMessageMetadata || m.metadata,
                  }
                : m
            )
          );
        }
        setIsStreaming(Boolean(state.isStreaming));
      }

      if (
        state.currentMessageMetadata &&
        state.currentMessageMetadata !== prev.currentMessageMetadata
      ) {
        const assistantId = streamingMsgIdRef.current;
        if (assistantId) {
          setMessages((curr) =>
            curr.map((m) =>
              m.id === assistantId ? { ...m, metadata: state.currentMessageMetadata } : m
            )
          );
        }
      }

      if (!state.isStreaming && !state.isLoading && streamingMsgIdRef.current) {
        const assistantId = streamingMsgIdRef.current;
        setMessages((curr) =>
          curr.map((m) => (m.id === assistantId ? { ...m, status: 'done' } : m))
        );
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      }

      lastStateRef.current = {
        currentQuestion: state.currentQuestion || '',
        currentResponse: state.currentResponse || '',
        isStreaming: Boolean(state.isStreaming),
        isLoading: Boolean(state.isLoading),
        currentMessageMetadata: state.currentMessageMetadata || null,
      };
    };

    const onState = (_event, state) => {
      if (!state) return;
      pendingState = state;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const next = pendingState;
        pendingState = null;
        if (next) applyState(next);
      });
    };

    window.api.askView.onAskStateUpdate(onState);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.api.askView.removeOnAskStateUpdate?.(onState);
    };
  }, []);

  const handleSend = useCallback(
    async (text, label) => {
      if (!text || !window.api?.askView?.sendMessage) return;
      const historySnapshot = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map((m) => (m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}`));
      // Force the thread to snap back to the bottom — the new user message
      // and the streaming response should always be visible without manual scroll.
      window.dispatchEvent(new CustomEvent('cluely-ask:scroll-bottom'));
      try {
        await window.api.askView.sendMessage(
          text,
          {
            displayPrompt: label || text,
            maxMode: smartMode,
            webSearch: false,
          },
          historySnapshot
        );
      } catch (err) {
        console.error('[CluelyAskView] sendMessage failed:', err);
      }
    },
    [messages, smartMode]
  );

  // Cluely-parity: clicking a quick action writes the prompt into the textarea
  // first (with a brief animation), waits 180ms so the user perceives the
  // transition, then submits. Avoids the "instant" feel.
  const handleQuickAction = useCallback(
    (prompt, label) => {
      if (!prompt) return;
      composerRef.current?.setValueAndFocus(label || prompt);
      window.dispatchEvent(new CustomEvent('cluely-ask:scroll-bottom'));
      setTimeout(() => {
        composerRef.current?.clear();
        handleSend(prompt, label);
      }, 180);
    },
    [handleSend]
  );

  const handleToggleSmart = useCallback(() => setSmartMode((v) => !v), []);
  const handleMoreClick = useCallback(() => {}, []);

  return (
    <div className="cluely-ask-root" ref={rootRef}>
      <CluelyThreadViewport messages={messages} isStreaming={isStreaming} />
      <CluelyQuickActions disabled={isStreaming} onSend={handleQuickAction} />
      <CluelyComposer
        ref={composerRef}
        disabled={isStreaming}
        onSend={handleSend}
        smartMode={smartMode}
        onToggleSmart={handleToggleSmart}
        onMoreClick={handleMoreClick}
      />
    </div>
  );
}
