import React from 'react';

// Cluely-exact icons — extracted from cluely.app.asar/dist/assets/chat-DZdhHSp0.js.
// The bundle imports lucide-react via createLucideIcon with these path sets:
//   Assist                  → sparkles
//   What should I say?      → wand-sparkles
//   Follow-up questions     → message-square-more
//   Recap                   → rotate-cw
// Lucide defaults: viewBox 0 0 24 24, fill=none, stroke=currentColor,
// strokeWidth=2, strokeLinecap=round, strokeLinejoin=round.

const SVG_BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const IconSparkles = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...SVG_BASE} aria-hidden="true">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </svg>
);

const IconWandSparkles = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...SVG_BASE} aria-hidden="true">
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
    <path d="m14 7 3 3" />
    <path d="M5 6v4" />
    <path d="M19 14v4" />
    <path d="M10 2v2" />
    <path d="M7 8H3" />
    <path d="M21 16h-4" />
    <path d="M11 3H9" />
  </svg>
);

const IconMessageSquareMore = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...SVG_BASE} aria-hidden="true">
    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
    <path d="M12 11h.01" />
    <path d="M16 11h.01" />
    <path d="M8 11h.01" />
  </svg>
);

const IconRotateCw = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...SVG_BASE} aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const ACTIONS = [
  {
    label: 'Aide',
    Icon: IconSparkles,
    prompt:
      "Basé sur ce qu'il y a sur mon écran, donne-moi les meilleures informations pour m'aider au moment présent.",
  },
  {
    label: 'Que dire ?',
    Icon: IconWandSparkles,
    prompt:
      'Que devrais-je dire maintenant ? Donne uniquement les mots à prononcer, sans introduction.',
  },
  {
    label: 'Questions',
    Icon: IconMessageSquareMore,
    prompt:
      "Suggère deux questions de relance que je peux poser pour faire avancer la conversation. Format : deux puces.",
  },
  {
    label: 'Résumé',
    Icon: IconRotateCw,
    prompt: 'Résume ce qui vient de se passer dans la conversation.',
  },
];

export default function CluelyQuickActions({ disabled = false, onSend }) {
  return (
    <div className="cluely-actions" role="toolbar" aria-label="Actions rapides">
      {ACTIONS.map((action, index) => {
        const Icon = action.Icon;
        return (
          <React.Fragment key={action.label}>
            <button
              type="button"
              className="cluely-action-btn"
              disabled={disabled}
              onClick={() => onSend?.(action.prompt, action.label)}
            >
              <Icon />
              <span>{action.label}</span>
            </button>
            {index < ACTIONS.length - 1 && <span className="cluely-action-dot" aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
