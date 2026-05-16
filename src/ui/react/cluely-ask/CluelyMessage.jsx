import React, { useCallback, useState } from 'react';
import { ViewedScreenLabel, ViewedFilesLabel } from './CluelyViewedContext.jsx';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function UserMessage({ message }) {
  return (
    <div className="cluely-user-row" data-role="user">
      <div className="cluely-user-bubble-wrap">
        <div className="cluely-user-bubble">
          <p>{message?.metadata?.userDisplayText || message?.text || ''}</p>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ message }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message?.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [message?.text]);

  const isStreaming = message?.status === 'running';
  const hasText = !!(message?.text && message.text.length > 0);

  return (
    <div className="cluely-assistant-row" data-role="assistant">
      <ViewedScreenLabel message={message} />
      <ViewedFilesLabel message={message} />
      <div className="cluely-assistant-content">
        {isStreaming && !hasText ? (
          <div className="cluely-loading-dot" role="status" aria-label="Chargement" />
        ) : (
          <div
            // smd.js streaming renderer outputs HTML into message.html when available;
            // fallback to escaped plaintext when only message.text exists.
            dangerouslySetInnerHTML={{
              __html: message?.html || escapeHtml(message?.text || ''),
            }}
          />
        )}
      </div>
      {hasText && (
        <button
          type="button"
          className="cluely-copy-btn"
          onClick={copy}
          aria-label={copied ? 'Copié' : 'Copier la réponse'}
        >
          {copied ? <IconCheck /> : <IconCopy />}
        </button>
      )}
    </div>
  );
}

export default function CluelyMessage({ message }) {
  if (!message) return null;
  if (message.role === 'user') return <UserMessage message={message} />;
  return <AssistantMessage message={message} />;
}
