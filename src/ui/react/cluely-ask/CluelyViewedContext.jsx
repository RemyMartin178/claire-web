import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * "Viewed screen" label — Cluely parity.
 *
 * The preview is rendered via React Portal into document.body with
 * position: fixed coordinates computed from the trigger's
 * getBoundingClientRect(). This is the only reliable way to escape every
 * parent's overflow/contain context (the thread viewport has overflow-y:auto,
 * the panel has overflow:hidden, etc.).
 */
export function ViewedScreenLabel({ message }) {
  const url =
    message?.metadata?.requiredScreenshot?.url ||
    message?.screenshotUrl ||
    null;

  const triggerRef = useRef(null);
  const hoverTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(null);
  const [status, setStatus] = useState('loading');
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  if (!url) return null;

  const openPreview = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const previewWidth = 320;
    const padding = 12;

    setPosition({
      top: rect.bottom + 8,
      left: clamp(rect.left, padding, window.innerWidth - previewWidth - padding),
    });

    setStatus('loading');
    setDisplayUrl(null);
    setOpen(true);

    // Match Cluely: 1s delay before revealing the actual screenshot —
    // gives the impression the model is "looking at" the screen.
    hoverTimerRef.current = setTimeout(() => {
      setDisplayUrl(url);
    }, 1000);
  };

  const closePreview = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setOpen(false);
    setDisplayUrl(null);
  };

  return (
    <>
      <p
        ref={triggerRef}
        className="cluely-viewed-label"
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
      >
        Écran consulté
      </p>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="cluely-viewed-preview-portal"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={() => {
              // Keep open if cursor moves over the preview itself
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              setOpen(true);
            }}
            onMouseLeave={closePreview}
          >
            <div
              className={`cluely-viewed-image-wrap ${
                status === 'loaded' ? 'loaded' : 'loading'
              }`}
            >
              {status === 'loading' && (
                <div className="cluely-viewed-loading">
                  <div className="cluely-viewed-spinner" />
                </div>
              )}

              {status === 'error' && (
                <div className="cluely-viewed-error">
                  Impossible de charger la capture
                </div>
              )}

              {displayUrl && (
                <img
                  src={displayUrl}
                  alt="Capture d'écran consultée"
                  className={`cluely-viewed-img ${
                    status === 'loaded' ? 'visible' : 'hidden'
                  }`}
                  onLoad={() => setStatus('loaded')}
                  onError={() => setStatus('error')}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function ViewedFilesLabel({ message }) {
  const hasViewedFiles =
    (message?.metadata?.viewedFiles?.length || 0) > 0 ||
    !!message?.metadata?.toolCalls?.some?.((call) => call?.toolName === 'file_search');

  if (!hasViewedFiles) return null;

  return <p className="cluely-viewed-label">Fichiers consultés</p>;
}
