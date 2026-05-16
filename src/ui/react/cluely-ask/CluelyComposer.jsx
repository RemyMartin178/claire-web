import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';

const MAX_TEXTAREA_HEIGHT = 50;

function resizeTextarea(el) {
  if (!el) return;
  const previous = el.style.height;
  // Collapse first so scrollHeight reports the *content* height, not the styled one.
  el.style.height = '0px';
  const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
  const next = `${nextHeight}px`;
  // Skip the write if nothing changed — avoids the "trait" caret flash users
  // were seeing on every keystroke (layout was thrashing per char).
  el.style.height = previous !== next ? next : previous;
  const shouldScroll = el.scrollHeight > MAX_TEXTAREA_HEIGHT;
  el.style.overflowY = shouldScroll ? 'auto' : 'hidden';
}

const IconSend = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14M12 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMore = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const CluelyComposer = forwardRef(function CluelyComposer(
  {
    disabled = false,
    onSend,
    smartMode = false,
    onToggleSmart,
    onMoreClick,
    autoFocus = true,
  },
  ref
) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(autoFocus);
  const [pulse, setPulse] = useState(false);
  const textareaRef = useRef(null);
  const blurTimerRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Small delay: avoids flicker when refocusing programmatically
    blurTimerRef.current = setTimeout(() => setIsFocused(false), 80);
  }, []);

  // Expose imperative API to parent (used to animate quick-action prompts in)
  useImperativeHandle(
    ref,
    () => ({
      setValueAndFocus: (text) => {
        setValue(text);
        setPulse(true);
        setTimeout(() => setPulse(false), 170);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            resizeTextarea(textareaRef.current);
          }
        });
      },
      clear: () => {
        setValue('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.overflowY = 'hidden';
        }
      },
      focus: () => textareaRef.current?.focus(),
    }),
    []
  );

  const send = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    setValue('');
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    });
  }, [value, disabled, onSend]);

  const onChange = useCallback((event) => {
    setValue(event.target.value);
    resizeTextarea(event.target);
  }, []);

  const onKeyDown = useCallback(
    (event) => {
      if (event.isComposing || event.nativeEvent?.isComposing) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    },
    [send]
  );

  return (
    <div className={`cluely-composer${isFocused ? ' is-focused' : ''}`}>
      <div className="cluely-textarea-wrap">
        <textarea
          ref={textareaRef}
          className={`cluely-textarea${pulse ? ' pulse' : ''}`}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Pose une question…"
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          spellCheck={false}
        />
        <button
          type="button"
          className="cluely-send-btn"
          disabled={disabled || !value.trim()}
          onClick={send}
          aria-label="Envoyer"
        >
          <IconSend />
        </button>
      </div>
      <div className={`cluely-composer-footer ${isFocused ? 'focused' : 'blurred'}`}>
        <button
          type="button"
          className={`cluely-smart-chip${smartMode ? ' active' : ''}`}
          onClick={onToggleSmart}
          disabled={disabled}
        >
          Smart
        </button>
        <button
          type="button"
          className="cluely-more-btn"
          onClick={onMoreClick}
          disabled={disabled}
          aria-label="Plus d'actions"
        >
          <IconMore />
        </button>
      </div>
    </div>
  );
});

export default CluelyComposer;
