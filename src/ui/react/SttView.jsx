import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
.stt-transcription-container {
  overflow-y: auto;
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 150px;
  max-height: 600px;
  position: relative;
  z-index: 1;
  flex: 1;
  background: transparent;
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
}
.stt-transcription-container { scrollbar-width: none; }
.stt-transcription-container::-webkit-scrollbar { display: none; }

/* === BUBBLE ROWS === */
.stt-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.stt-row.me { justify-content: flex-end; }
.stt-row.them { justify-content: flex-start; }

/* === COPY BUTTON (per bubble) === */
.stt-bubble-copy {
  flex-shrink: 0;
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.35); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s, background 0.12s, color 0.12s;
  overflow: hidden; position: relative;
  margin-bottom: 4px;
}
.stt-row:hover .stt-bubble-copy { opacity: 1; }
.stt-bubble-copy:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.80); }
.stt-bubble-copy svg {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  transition: opacity 0.15s, transform 0.15s;
}
.stt-bubble-copy .stt-check-icon { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
.stt-bubble-copy.stt-copied .stt-copy-icon { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
.stt-bubble-copy.stt-copied .stt-check-icon { opacity:1; transform:translate(-50%,-50%) scale(1); }

/* === BUBBLES === */
.stt-bubble {
  max-width: 82%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 13px; line-height: 1.55;
  word-break: break-word;
  box-sizing: border-box;
  user-select: text;
}
/* Me — bulle bleue identique à AskView */
.stt-bubble.me {
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
  color: #CBE3FF;
  border-radius: 14px 14px 4px 14px;
  box-shadow: 0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff;
  font-weight: 450;
}
/* Them — frosted glass clair */
.stt-bubble.them {
  background: rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.88);
  border-radius: 14px 14px 14px 4px;
  border: 1px solid rgba(255,255,255,0.11);
  font-weight: 400;
}
/* Partial — légèrement atténué */
.stt-bubble.partial { opacity: 0.65; font-style: italic; }

/* === SPEAKER LABEL === */
.stt-speaker-label {
  font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255,255,255,0.32);
  margin-bottom: 3px; padding: 0 4px;
}
.stt-row.them .stt-speaker-label { text-align: left; }
.stt-row.me .stt-speaker-label { text-align: right; }

/* === EMPTY STATE === */
.stt-empty-state {
  display: flex; align-items: center; justify-content: center; flex: 1;
  min-height: 180px; color: rgba(255,255,255,0.25); font-size: 13px;
  font-style: italic; font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
}
`;

function getSpeakerClass(speaker) {
  const s = speaker.toLowerCase();
  if (s === 'me') return 'me';
  return 'them';
}

const SttView = forwardRef(function SttView({ isVisible, onMessagesUpdated }, ref) {
  const [sttMessages, setSttMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const containerRef = useRef(null);
  const messageIdCounterRef = useRef(0);
  const shouldScrollRef = useRef(false);
  const copyTimeoutRef = useRef(null);
  // Stable ref so the IPC listener (registered once) always calls the latest callback
  const onMessagesUpdatedRef = useRef(onMessagesUpdated);
  useEffect(() => { onMessagesUpdatedRef.current = onMessagesUpdated; }, [onMessagesUpdated]);

  injectStyles('stt-view-styles', CSS);

  useImperativeHandle(ref, () => ({
    resetTranscript() {
      setSttMessages([]);
    },
    getTranscriptText() {
      return sttMessages.map(m => `${m.speaker}: ${m.text}`).join('\n');
    },
  }));

  // Register IPC listener exactly once (on mount) to prevent double-registration
  // that occurs when onMessagesUpdated reference changes (viewMode chain).
  useEffect(() => {
    if (!window.api) return;

    const handleSttUpdate = (event, { speaker, text, isFinal, isPartial }) => {
      if (text === undefined) return;

      const container = containerRef.current;
      shouldScrollRef.current = container
        ? container.scrollTop + container.clientHeight >= container.scrollHeight - 10
        : false;

      setSttMessages(prev => {
        const findLastPartialIdx = (spk) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].speaker === spk && prev[i].isPartial) return i;
          }
          return -1;
        };

        const newMessages = [...prev];
        const targetIdx = findLastPartialIdx(speaker);

        // Echo suppression: if "Me" final text is mostly contained in a recent "Them" message
        // (mic picking up room audio from speakers), discard it.
        if (isFinal && speaker === 'Me' && text.length > 8) {
          const recentThem = newMessages.filter(m => m.speaker === 'Them' && m.isFinal).slice(-5);
          const meClean = text.toLowerCase().replace(/[^\wàâäéèêëîïôùûüç\s]/g, '').trim();
          const isEcho = recentThem.some(m => {
            const themClean = m.text.toLowerCase().replace(/[^\wàâäéèêëîïôùûüç\s]/g, '').trim();
            // Direct match
            if (meClean === themClean) return true;
            // Word overlap: if >60% of "me" words appear in "them", it's an echo
            const meWords = meClean.split(/\s+/).filter(w => w.length > 2);
            if (meWords.length < 3) return false;
            const overlap = meWords.filter(w => themClean.includes(w)).length;
            return overlap / meWords.length > 0.60;
          });
          if (isEcho) return prev;
        }
        // Also suppress "Them" echoing recent "Me" (system audio capturing mic)
        if (isFinal && speaker === 'Them' && text.length > 8) {
          const recentMe = newMessages.filter(m => m.speaker === 'Me' && m.isFinal).slice(-5);
          const themClean = text.toLowerCase().replace(/[^\wàâäéèêëîïôùûüç\s]/g, '').trim();
          const isEcho = recentMe.some(m => {
            const meClean = m.text.toLowerCase().replace(/[^\wàâäéèêëîïôùûüç\s]/g, '').trim();
            if (themClean === meClean) return true;
            const themWords = themClean.split(/\s+/).filter(w => w.length > 2);
            if (themWords.length < 3) return false;
            const overlap = themWords.filter(w => meClean.includes(w)).length;
            return overlap / themWords.length > 0.60;
          });
          if (isEcho) return prev;
        }

        if (isPartial) {
          if (targetIdx !== -1) {
            newMessages[targetIdx] = { ...newMessages[targetIdx], text, isPartial: true, isFinal: false };
          } else {
            newMessages.push({ id: messageIdCounterRef.current++, speaker, text, isPartial: true, isFinal: false });
          }
        } else if (isFinal) {
          if (targetIdx !== -1) {
            newMessages[targetIdx] = { ...newMessages[targetIdx], text, isPartial: false, isFinal: true };
          } else {
            const lastSame = [...newMessages].reverse().find(m => m.speaker === speaker);
            if (!lastSame || lastSame.text !== text) {
              newMessages.push({ id: messageIdCounterRef.current++, speaker, text, isPartial: false, isFinal: true });
            }
          }
        }

        if (onMessagesUpdatedRef.current) onMessagesUpdatedRef.current(newMessages);
        return newMessages;
      });
    };

    window.api.sttView.onSttUpdate(handleSttUpdate);
    return () => {
      window.api.sttView.removeOnSttUpdate(handleSttUpdate);
    };
  }, []); // empty deps — register once on mount, remove on unmount

  useEffect(() => {
    if (shouldScrollRef.current && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }, 0);
      shouldScrollRef.current = false;
    }
  }, [sttMessages]);

  const copyBubble = useCallback(async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {}
  }, []);

  if (!isVisible) return <div style={{ display: 'none' }} />;

  // Show speaker label only when speaker changes
  const shouldShowLabel = (msg, index) => {
    if (index === 0) return true;
    return sttMessages[index - 1].speaker !== msg.speaker;
  };

  return (
    <div className="stt-transcription-container" ref={containerRef}>
      {sttMessages.length === 0 ? (
        <div className="stt-empty-state">En attente de parole...</div>
      ) : (
        sttMessages.map((msg, index) => {
          const cls = getSpeakerClass(msg.speaker);
          const isCopied = copiedId === msg.id;
          return (
            <div key={msg.id}>
              {shouldShowLabel(msg, index) && (
                <div className={`stt-speaker-label`} style={{ textAlign: cls === 'me' ? 'right' : 'left' }}>
                  {cls === 'me' ? 'Vous' : 'Interlocuteur'}
                </div>
              )}
              <div className={`stt-row ${cls}`}>
                {/* Copy button left of bubble for "them", right for "me" */}
                {cls === 'them' && (
                  <button
                    className={`stt-bubble-copy${isCopied ? ' stt-copied' : ''}`}
                    onClick={() => copyBubble(msg.id, msg.text)}
                    title="Copier"
                  >
                    <svg className="stt-copy-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    <svg className="stt-check-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </button>
                )}
                <div className={`stt-bubble ${cls}${msg.isPartial ? ' partial' : ''}`}>
                  {msg.text}
                </div>
                {cls === 'me' && (
                  <button
                    className={`stt-bubble-copy${isCopied ? ' stt-copied' : ''}`}
                    onClick={() => copyBubble(msg.id, msg.text)}
                    title="Copier"
                  >
                    <svg className="stt-copy-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    <svg className="stt-check-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
});

export default SttView;
