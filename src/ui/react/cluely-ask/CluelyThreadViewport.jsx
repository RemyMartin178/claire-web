import React, { useCallback, useEffect, useRef, useState } from 'react';
import CluelyMessage from './CluelyMessage.jsx';

const IconArrowDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 5v14M19 12l-7 7-7-7"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function CluelyThreadViewport({ messages = [], isStreaming = false }) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const autoScrollRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const updateBottomState = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 24;
    setIsAtBottom(atBottom);
    autoScrollRef.current = atBottom;
  }, []);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Observe the inner content height — every time it grows (new message,
  // streamed token, screenshot revealing, etc.) re-pin to bottom unless the
  // user has manually scrolled up.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (autoScrollRef.current) {
        // Double rAF so layout has settled before we measure scrollHeight.
        requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('auto')));
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  // Initial mount → ensure we are at the bottom.
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('auto')));
  }, [scrollToBottom]);

  // Listen for explicit scroll-to-bottom requests (e.g. handleSend fires this
  // right when a new message is submitted, so the user instantly sees their
  // question + the assistant placeholder).
  useEffect(() => {
    const onForce = () => {
      autoScrollRef.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('auto')));
    };
    window.addEventListener('cluely-ask:scroll-bottom', onForce);
    return () => window.removeEventListener('cluely-ask:scroll-bottom', onForce);
  }, [scrollToBottom]);

  // Forced re-scroll when messages.length changes (new turn) even if the
  // ResizeObserver hasn't fired yet (e.g. immediate handover after sending).
  useEffect(() => {
    if (!autoScrollRef.current) return;
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('auto')));
  }, [messages.length, isStreaming, scrollToBottom]);

  return (
    <div className="cluely-thread">
      <div
        ref={viewportRef}
        className="cluely-thread-viewport"
        onScroll={updateBottomState}
        style={{
          '--viewport-bottom-mask-size': isAtBottom ? '0px' : '60px',
        }}
      >
        <div ref={contentRef}>
          {messages.map((message) => (
            <CluelyMessage key={message.id} message={message} />
          ))}
        </div>
      </div>
      {!isAtBottom && (
        <div className="cluely-scroll-bottom-wrap">
          <button
            type="button"
            className="cluely-scroll-bottom"
            onClick={() => {
              autoScrollRef.current = true;
              scrollToBottom('smooth');
            }}
            aria-label="Aller en bas"
          >
            <IconArrowDown />
          </button>
        </div>
      )}
    </div>
  );
}
