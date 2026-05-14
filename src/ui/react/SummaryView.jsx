import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes sv-item-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }

.summary-insights-container {
  overflow-y: auto;
  padding: 10px 12px 14px;
  position: relative; z-index: 1;
  min-height: 0; flex: 1;
  background: transparent;
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  scrollbar-width: none;
}
.summary-insights-container::-webkit-scrollbar { display: none; }

/* Section label */
.summary-section-label {
  color: rgba(255,255,255,0.28);
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  margin: 14px 0 6px 2px; display: block;
}
.summary-section-label:first-child { margin-top: 2px; }

/* Bullet items — Résumé + À retenir */
.summary-bullet {
  display: flex; align-items: flex-start; gap: 8px;
  color: rgba(255,255,255,0.72);
  font-size: 12.5px; line-height: 1.6;
  margin: 3px 0; padding: 2px 4px;
  cursor: default; user-select: text;
  animation: sv-item-in 0.22s ease both;
}
.summary-bullet-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  flex-shrink: 0; margin-top: 9px;
}


/* Action items — clickable chips */
.summary-action-list {
  display: flex; flex-direction: column; gap: 4px;
  margin-top: 2px;
}
.summary-action-item {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 7px 11px;
  color: rgba(255,255,255,0.75); font-size: 12px; line-height: 1.4;
  cursor: pointer; font-family: inherit; font-weight: 450;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
  text-align: left;
  animation: sv-item-in 0.22s ease both;
}
.summary-action-item:hover {
  background: rgba(21,98,223,0.16);
  border-color: rgba(21,98,223,0.36);
  color: rgba(200,225,255,0.92);
}
.summary-action-item:active { transform: scale(0.98); }
.summary-action-icon {
  flex-shrink: 0; opacity: 0.45; color: rgba(255,255,255,0.6);
}
.summary-action-item:hover .summary-action-icon { opacity: 0.7; color: #93c5fd; }

.summary-empty-state {
  display: flex; align-items: center; justify-content: center;
  min-height: 100px; color: rgba(255,255,255,0.20); font-size: 12px; font-style: italic;
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
}
`;

const EMPTY_DATA = {
  summary: [],
  topic: { header: '', bullets: [] },
  retenir: [],
  actions: [],
};

function normalizeDisplayText(text) {
  if (typeof text !== 'string' || !text) return text;

  const replacements = [
    ['ÔÇÖ', '’'],
    ['ÔÇª', '…'],
    ['ÔÇô', '–'],
    ['ÔÇö', '—'],
    ['ÔÇ£', '“'],
    ['ÔÇ"', '”'],
    ['ÔÇ¥', '•'],
    ['├®', 'é'],
    ['├¿', 'è'],
    ['├á', 'à'],
    ['├¢', 'â'],
    ['├ª', 'ê'],
    ['├«', 'ë'],
    ['├§', 'ç'],
    ['├╗', 'û'],
    ['├¹', 'ù'],
    ['├´', 'ô'],
    ['├î', 'î'],
    ['├ï', 'ï'],
    ['Ã©', 'é'],
    ['Ã¨', 'è'],
    ['Ã ', 'à'],
    ['Ã¢', 'â'],
    ['Ãª', 'ê'],
    ['Ã«', 'ë'],
    ['Ã§', 'ç'],
    ['Ã»', 'û'],
    ['Ã¹', 'ù'],
    ['Ã´', 'ô'],
    ['Ã®', 'î'],
    ['Ã¯', 'ï'],
    ['Â«', '«'],
    ['Â»', '»'],
  ];

  let normalized = text;
  replacements.forEach(([from, to]) => {
    normalized = normalized.split(from).join(to);
  });

  return normalized;
}

function renderFormattedText(text) {
  const normalized = normalizeDisplayText(text || '');
  // Strip any "**label** : " prefix and inline bold markers — bullets must be plain
  const plain = normalized
    .replace(/^\*\*[^*]+\*\*\s*:\s*/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
  return plain;
}

const SummaryView = forwardRef(function SummaryView({ isVisible, hasCompletedRecording }, ref) {
  const [structuredData, setStructuredData] = useState(EMPTY_DATA);
  // Ref keeps a always-current copy so getSummaryText never reads a stale closure
  const dataRef = useRef(EMPTY_DATA);

  injectStyles('summary-view-styles', CSS);

  useImperativeHandle(ref, () => ({
    resetAnalysis() {
      const empty = { ...EMPTY_DATA };
      dataRef.current = empty;
      setStructuredData(empty);
    },
    getSummaryText() {
      const data = dataRef.current || EMPTY_DATA;
      const sections = [];
      if (data.topic?.header) sections.push(normalizeDisplayText(data.topic.header));
      if (data.summary?.length > 0) sections.push(`Résumé :\n${data.summary.map(s => `• ${s}`).join('\n')}`);
      if (data.retenir?.length > 0) sections.push(`À retenir :\n${data.retenir.map(r => `• ${r}`).join('\n')}`);
      return sections.join('\n\n').trim();
    },
  }));

  useEffect(() => {
    if (!window.api) return;
    const handleSummaryUpdate = (event, data) => {
      dataRef.current = data;
      setStructuredData(data);
    };
    window.api.summaryView.onSummaryUpdate(handleSummaryUpdate);
    return () => { window.api.summaryView.removeAllSummaryUpdateListeners?.(); };
  }, []);

  if (!isVisible) return <div style={{ display: 'none' }} />;

  const data = structuredData || EMPTY_DATA;
  const hasAnyContent = (data.summary?.length > 0) || (data.retenir?.length > 0) || (data.actions?.length > 0);

  const handleActionClick = (action) => {
    window.api?.askView?.sendMessage?.(normalizeDisplayText(action), {}).catch?.(() => {});
  };

  const renderBullet = (text, key) => (
    <div key={key} className="summary-bullet">
      <span className="summary-bullet-dot" />
      <span>{renderFormattedText(text)}</span>
    </div>
  );

  return (
    <div className="summary-insights-container">
      {!hasAnyContent ? (
        <div className="summary-empty-state">En attente d'analyse...</div>
      ) : (
        <>
          {data.topic?.header && (
            <span className="summary-section-label">{normalizeDisplayText(data.topic.header)}</span>
          )}

          {data.summary?.length > 0 && (
            <>
              <span className="summary-section-label">Résumé</span>
              {data.summary.slice(0, 5).map((bullet, i) => renderBullet(bullet, `s-${i}`))}
            </>
          )}

          {data.retenir?.length > 0 && (
            <>
              <span className="summary-section-label">À retenir</span>
              {data.retenir.slice(0, 5).map((item, i) => renderBullet(item, `r-${i}`))}
            </>
          )}

          {data.actions?.length > 0 && (
            <>
              <span className="summary-section-label">Actions</span>
              <div className="summary-action-list">
                {data.actions.slice(0, 5).map((action, i) => (
                  <button
                    key={`a-${i}`}
                    className="summary-action-item"
                    onClick={() => handleActionClick(action)}
                  >
                    <svg className="summary-action-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span>{renderFormattedText(action)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
});

export default SummaryView;
