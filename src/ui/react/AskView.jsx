import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parser, parser_write, parser_end, default_renderer } from '../assets/smd.js';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes ask-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ask-fade-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-6px); } }
@keyframes ask-pulse { 0%,80%,100% { opacity:0.25; transform:scale(0.75); } 40% { opacity:1; transform:scale(1); } }
@keyframes ask-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes ask-chip-send { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(1.06); opacity: 0.8; } 100% { transform: scale(0.88); opacity: 0; } }

.ask-view-root {
  display: flex; flex-direction: column; width: 100%;
  /* Cluely font: Geist Variable, sans-serif */
  font-family: 'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased; color: white;
  /* Cluely dark glass: bg-[hsla(252,10%,10%,0.8)] equivalent */
  background: hsla(252, 10%, 10%, 0.82);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(28px) saturate(190%); -webkit-backdrop-filter: blur(28px) saturate(190%);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset;
  overflow: hidden; position: relative;
}
.ask-view-root::before {
  content: ''; position: absolute; top: 0; left: 14px; right: 14px; height: 1px; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.10) 60%, transparent);
}
.ask-view-root * { font-family: inherit; cursor: default; user-select: none; }

/* === CLUELY-STYLE TOP TABS ("Assist · What should I say? · Follow-up questions · Recap") === */
.ask-top-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 12px 0;
  flex-shrink: 0;
}
.ask-tab-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  transition: color 0.14s, background 0.14s;
  white-space: nowrap;
}
.ask-tab-item:hover { color: rgba(255,255,255,0.80); background: rgba(255,255,255,0.06); }
.ask-tab-item.active { color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.08); }
.ask-tab-item svg { opacity: 0.7; flex-shrink: 0; }
.ask-tab-item.active svg { opacity: 1; }
.ask-tab-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  flex-shrink: 0;
  margin: 0 2px;
}

/* === RESPONSE PANEL === */
.ask-response-panel {
  border-bottom: 1px solid rgba(255,255,255,0.07);
  overflow-y: auto; position: relative;
  max-height: 480px;
  animation: ask-fade-in 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
}
.ask-response-panel { scrollbar-width: none; }
.ask-response-panel::-webkit-scrollbar { display: none; }
/* Expand animation when quota is exceeded */
.ask-response-panel { transition: min-height 0.38s cubic-bezier(0.34, 1.2, 0.64, 1); }
.ask-response-panel.quota-exceeded { min-height: 220px; }

/* === HISTORY ENTRIES === */
.ask-history-entry {
}
.ask-history-response {
  padding: 4px 12px 10px;
  font-size: 13.5px; line-height: 1.65; color: rgba(255,255,255,0.75);
}
.ask-history-response p { margin: 0 0 7px; }
.ask-history-response p:last-child { margin-bottom: 0; }
.ask-history-response strong { color: rgba(255,255,255,0.88); font-weight: 600; }
.ask-history-response code { background: rgba(255,255,255,0.10); padding: 1px 5px; border-radius: 4px; font-size: 12px; }

.ask-question-area {
  display: flex; justify-content: flex-end; align-items: center; gap: 6px;
  padding: 12px 12px 4px;
}
.ask-question-area:hover .ask-bubble-copy { opacity: 1; }
.ask-bubble-copy {
  flex-shrink: 0;
  width: 22px; height: 22px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.4); cursor: pointer !important;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s, background 0.12s, color 0.12s;
  overflow: hidden; position: relative;
}
.ask-bubble-copy:hover { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.85); }
.ask-bubble-copy svg { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); transition: opacity 0.15s, transform 0.15s; }
.ask-bubble-copy .check-icon { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
.ask-bubble-copy.copied .copy-icon { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
.ask-bubble-copy.copied .check-icon { opacity:1; transform:translate(-50%,-50%) scale(1); }

/* === RESPONSE COPY === */
.ask-response-footer {
  display: flex; justify-content: flex-start; padding: 2px 0 6px;
  opacity: 0; transition: opacity 0.15s;
}
.ask-response-area:hover .ask-response-footer { opacity: 1; }
.ask-response-copy {
  width: 22px; height: 22px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.4); cursor: pointer !important;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
  overflow: hidden; position: relative;
}
.ask-response-copy:hover { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.85); }
.ask-response-copy svg { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); transition: opacity 0.15s, transform 0.15s; }
.ask-response-copy .check-icon { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
.ask-response-copy.copied .copy-icon { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
.ask-response-copy.copied .check-icon { opacity:1; transform:translate(-50%,-50%) scale(1); }

.ask-question-bubble {
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
  color: #CBE3FF; border-radius: 14px 14px 4px 14px;
  padding: 8px 13px; font-size: 13px; font-weight: 450; max-width: 85%;
  line-height: 1.5; word-break: break-word; user-select: text; cursor: text;
  box-shadow: 0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff;
}

.ask-response-area {
  padding: 8px 12px 4px;
  opacity: 0; transition: opacity 0.2s ease;
}
.ask-response-area.visible { opacity: 1; }
.ask-response-area, .ask-response-area * { user-select: text !important; cursor: text !important; }

#askResponseContainer {
  font-size: 13.5px; line-height: 1.65; color: rgba(255,255,255,0.86);
  padding-bottom: 8px;
}
#askResponseContainer p { margin: 0 0 7px; }
#askResponseContainer p:last-child { margin-bottom: 0; }
#askResponseContainer h1,#askResponseContainer h2,#askResponseContainer h3 { font-size: 13.5px; font-weight: 600; margin: 10px 0 4px; color: rgba(255,255,255,0.96); }
#askResponseContainer ul,#askResponseContainer ol { padding-left: 18px; margin: 6px 0; }
#askResponseContainer li { margin: 3px 0; }
#askResponseContainer code { background: rgba(255,255,255,0.10); padding: 1px 5px; border-radius: 4px; font-family: 'Menlo','Consolas',monospace; font-size: 12px; }
#askResponseContainer pre { background: rgba(0,0,0,0.35); border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 8px 0; border: 1px solid rgba(255,255,255,0.08); }
#askResponseContainer pre code { background: none; padding: 0; font-size: 11.5px; }
#askResponseContainer strong { color: rgba(255,255,255,0.96); font-weight: 600; }
#askResponseContainer blockquote { border-left: 2px solid rgba(255,255,255,0.28); padding: 3px 10px; margin: 6px 0; color: rgba(255,255,255,0.60); }

.ask-loading-dots { display: flex; align-items: center; gap: 5px; padding: 8px 0; }
.ask-loading-dot { width: 5px; height: 5px; background: rgba(255,255,255,0.40); border-radius: 50%; animation: ask-pulse 1.4s ease-in-out infinite; }
.ask-loading-dot:nth-child(2) { animation-delay: 0.18s; }
.ask-loading-dot:nth-child(3) { animation-delay: 0.36s; }
.streaming-container { min-height: 8px; }

/* === QUOTA OVERLAY + CTA === */
/*
  Shine sans coupure visible :
  Le gradient fait 400% de large. On décale de 0% → -200% (= 1 période).
  Les deux extrémités du gradient sont la même couleur (#0c26a8) → pas de saut.
*/
@keyframes ask-shimmer {
  0%   { background-position: 0% center; }
  100% { background-position: -200% center; }
}
@keyframes ask-quota-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)  scale(1); }
}
/* Frosted overlay — covers the response panel, no overflow */
.ask-quota-overlay {
  position: absolute; inset: 0; z-index: 10;
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  background: rgba(8,8,12,0.78);
  border-radius: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 28px 24px 24px;
  overflow: hidden;
  animation: ask-quota-in 0.32s cubic-bezier(0.34,1.1,0.64,1) both;
}
.ask-quota-cta {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-align: center; width: 100%;
  animation: ask-fade-in 0.38s 0.08s cubic-bezier(0.34,1.1,0.64,1) both;
}
.ask-quota-title {
  font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.94);
}
.ask-quota-sub {
  font-size: 12px; color: rgba(255,255,255,0.42); line-height: 1.55; max-width: 220px;
}
.ask-quota-btn {
  margin-top: 4px;
  padding: 9px 24px; border-radius: 20px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 600; font-family: inherit;
  color: #CBE3FF;
  /* Gradient symétrique : même couleur aux deux bouts → zéro coupure */
  background: linear-gradient(90deg, #0c26a8 0%, #1562df 25%, #81b6ff 50%, #1562df 75%, #0c26a8 100%);
  background-size: 400% auto;
  animation: ask-shimmer 2.8s linear infinite;
  box-shadow: 0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff;
  transition: opacity 0.12s, transform 0.12s;
}
.ask-quota-btn:hover { opacity: 0.88; transform: scale(0.97); }
/* "ou réessayer demain" — gris blanc, sans lien bleu */
.ask-quota-wait {
  margin-top: 6px;
  font-size: 11.5px; color: rgba(255,255,255,0.38); cursor: default;
}

/* === PRO UNLOCKED OVERLAY (Apple-style welcome) === */
@keyframes ask-pro-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ask-pro-backdrop-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes ask-pro-icon-in {
  0%   { opacity: 0; transform: scale(0.4) translateY(12px); }
  65%  { opacity: 1; transform: scale(1.18) translateY(-4px); }
  80%  { transform: scale(0.94) translateY(2px); }
  100% { transform: scale(1)    translateY(0); }
}
@keyframes ask-pro-glow {
  0%,100% { opacity: 0.55; transform: scale(1); }
  50%     { opacity: 0.85; transform: scale(1.12); }
}
@keyframes ask-pro-text-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ask-pro-overlay {
  position: absolute; inset: 0; z-index: 20;
  border-radius: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0; padding: 28px 24px;
  /* frosted dark background */
  background: rgba(6,6,10,0.94);
  backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%);
  animation: ask-pro-backdrop-in 0.28s ease both;
}
.ask-pro-overlay.hiding { animation: ask-pro-backdrop-out 0.38s ease both; }
/* Icon wrapper with halo glow */
.ask-pro-icon-wrap {
  position: relative; width: 72px; height: 72px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
  animation: ask-pro-icon-in 0.55s 0.05s cubic-bezier(0.34,1.4,0.64,1) both;
}
.ask-pro-icon-wrap::before {
  content: '';
  position: absolute; inset: -10px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,172,255,0.28) 0%, transparent 70%);
  animation: ask-pro-glow 2.4s ease-in-out infinite;
}
.ask-pro-icon-wrap::after {
  content: '';
  position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(21,98,223,0.20) 60%, transparent 80%);
  border: 1px solid rgba(255,255,255,0.10);
}
.ask-pro-icon-inner {
  font-size: 32px; line-height: 1; position: relative; z-index: 1;
  filter: drop-shadow(0 0 8px rgba(130,185,255,0.6));
}
/* Title — gradient blanc→bleu clair */
.ask-pro-title {
  font-size: 17px; font-weight: 700; letter-spacing: -0.3px; text-align: center;
  background: linear-gradient(160deg, #ffffff 40%, #93c5fd 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: ask-pro-text-in 0.38s 0.26s cubic-bezier(0.34,1.1,0.64,1) both;
}
/* Sub-label */
.ask-pro-sub {
  margin-top: 7px;
  font-size: 12px; color: rgba(255,255,255,0.40); text-align: center; line-height: 1.5;
  animation: ask-pro-text-in 0.38s 0.38s cubic-bezier(0.34,1.1,0.64,1) both;
}
/* Pill badge "Pro" */
.ask-pro-badge {
  margin-top: 14px;
  padding: 3px 11px; border-radius: 20px;
  background: linear-gradient(90deg, rgba(21,98,223,0.30), rgba(99,160,255,0.20));
  border: 1px solid rgba(99,160,255,0.28);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
  color: rgba(147,197,253,0.90);
  animation: ask-pro-text-in 0.38s 0.48s cubic-bezier(0.34,1.1,0.64,1) both;
}

/* === THINK / WEB BUTTONS (icon-only) === */
.ask-think-btn, .ask-web-btn {
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px; padding: 5px 7px; cursor: pointer;
  color: rgba(255,255,255,0.50);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.ask-think-btn:hover, .ask-web-btn:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.88); border-color: rgba(255,255,255,0.18); }
.ask-think-btn:disabled, .ask-web-btn:disabled { pointer-events: none; opacity: 0.28; cursor: not-allowed; }
.ask-think-btn.active {
  background: rgba(124,58,237,0.18); border-color: rgba(139,92,246,0.50);
  color: #c4b5fd;
}
.ask-web-btn.active {
  background: rgba(5,150,105,0.18); border-color: rgba(16,185,129,0.50);
  color: #6ee7b7;
}

/* === SUGGESTIONS === */
.ask-suggestions {
  display: flex; gap: 6px; padding: 8px 12px 4px; overflow: hidden;
  min-height: 28px; position: relative;
}
.ask-suggestion-chip {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px; padding: 4px 11px; font-size: 11.5px; font-weight: 450;
  color: rgba(255,255,255,0.55); cursor: pointer; white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  animation: ask-fade-in 0.28s ease both;
}
.ask-suggestion-chip:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.92); border-color: rgba(255,255,255,0.20); }
.ask-suggestion-chip.sending { animation: ask-chip-send 0.22s ease-out forwards; pointer-events: none; }

/* === INPUT BAR === */
/* Cluely: flex items-end gap-2 px-2 py-2.5 pr-11 + footer with Smart/ellipsis/send */
.ask-bar {
  display: flex; flex-direction: column;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 2px 0 0;
  position: relative;
}

/* Textarea row — matches Cluely's ThreadPrimitive textarea */
.ask-bar-input-row {
  display: flex; align-items: flex-end; gap: 6px;
  padding: 6px 10px 6px 12px;
}

/* Cluely: block w-full resize-none bg-transparent px-2 py-2.5 font-medium text-[13px] text-foreground outline-none */
.ask-text-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: rgba(255,255,255,0.88); font-size: 13px; font-family: inherit; font-weight: 500;
  padding: 4px 0; min-width: 0; resize: none;
  user-select: text !important; cursor: text !important;
  -webkit-appearance: none;
  box-shadow: none; line-height: 1.5;
}
.ask-text-input::placeholder { color: rgba(255,255,255,0.28); font-weight: 400; }
.ask-text-input:-webkit-autofill,
.ask-text-input:-webkit-autofill:hover,
.ask-text-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
  -webkit-text-fill-color: rgba(255,255,255,0.88) !important;
  transition: background-color 5000s ease-in-out 0s;
  caret-color: rgba(255,255,255,0.88);
}

/* Footer row: Smart · ... · send */
.ask-bar-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 10px 10px 12px;
  gap: 6px;
}
.ask-bar-footer-left { display: flex; align-items: center; gap: 4px; }
.ask-bar-footer-right { display: flex; align-items: center; gap: 6px; }

/* "Smart" mode label (like Cluely's mode indicator) */
.ask-smart-label {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 9999px;
  font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.40);
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  cursor: default; transition: color 0.12s, background 0.12s;
}
.ask-smart-label:hover { color: rgba(255,255,255,0.70); background: rgba(255,255,255,0.09); }

/* Ellipsis button (Cluely: "Open more chat actions") */
.ask-more-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 9999px;
  background: transparent; border: none;
  color: rgba(255,255,255,0.40); cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.ask-more-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); transform: scale(1.05); }

/* Cluely send button: rounded-full bg-[linear-gradient(#0544a9,#022c70)] */
.ask-send-btn {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 9999px;
  background: linear-gradient(#0544a9, #022c70);
  border: none; color: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.12s, transform 0.12s;
  box-shadow: 0 0 0 0.5px #0c44a1, 0 85px 34px #00000005, 0 48px 29px #00000014,
              0 21px 21px #00000021, 0 5px 12px #00000029, inset 0 -1px #022c70, inset 0 0.5px #81b6ff;
}
.ask-send-btn:hover { transform: scale(1.05); filter: brightness(1.25); }
.ask-send-btn svg { width: 13px; height: 13px; }

/* === MATH BLOCKS === */
.ask-math-block {
  display: block; font-family: 'Courier New', Menlo, monospace;
  font-size: 12px; line-height: 1.7;
  background: rgba(255,255,255,0.05); border-radius: 8px;
  padding: 8px 12px; margin: 8px 0;
  color: rgba(255,255,255,0.88); overflow-x: auto; user-select: text; cursor: text;
}
.ask-math-inline {
  font-family: 'Courier New', Menlo, monospace; font-size: 11.5px;
  color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.07);
  border-radius: 4px; padding: 1px 4px;
}

`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── LaTeX → Unicode converter ──────────────────────────────────────────────
function convertLatexToUnicode(tex) {
  return tex
    .replace(/\\frac\{1\}\{2\}/g, '½').replace(/\\frac\{1\}\{4\}/g, '¼').replace(/\\frac\{3\}\{4\}/g, '¾')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\rho/g,'ρ').replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ')
    .replace(/\\delta/g,'δ').replace(/\\epsilon/g,'ε').replace(/\\zeta/g,'ζ').replace(/\\eta/g,'η')
    .replace(/\\theta/g,'θ').replace(/\\iota/g,'ι').replace(/\\kappa/g,'κ').replace(/\\lambda/g,'λ')
    .replace(/\\mu/g,'μ').replace(/\\nu/g,'ν').replace(/\\xi/g,'ξ').replace(/\\pi/g,'π')
    .replace(/\\sigma/g,'σ').replace(/\\tau/g,'τ').replace(/\\phi/g,'φ').replace(/\\chi/g,'χ')
    .replace(/\\psi/g,'ψ').replace(/\\omega/g,'ω')
    .replace(/\\Gamma/g,'Γ').replace(/\\Delta/g,'Δ').replace(/\\Theta/g,'Θ').replace(/\\Lambda/g,'Λ')
    .replace(/\\Pi/g,'Π').replace(/\\Sigma/g,'Σ').replace(/\\Phi/g,'Φ').replace(/\\Psi/g,'Ψ').replace(/\\Omega/g,'Ω')
    .replace(/\\infty/g,'∞').replace(/\\partial/g,'∂').replace(/\\nabla/g,'∇').replace(/\\forall/g,'∀').replace(/\\exists/g,'∃')
    .replace(/\\sqrt\{([^}]+)\}/g,'√($1)').replace(/\\sqrt/g,'√')
    .replace(/\\text\{([^}]+)\}/g,'$1').replace(/\\mathrm\{([^}]+)\}/g,'$1').replace(/\\mathbf\{([^}]+)\}/g,'$1')
    .replace(/\\cdot/g,'·').replace(/\\times/g,'×').replace(/\\div/g,'÷').replace(/\\pm/g,'±')
    .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈').replace(/\\equiv/g,'≡')
    .replace(/\\sum/g,'∑').replace(/\\int/g,'∫').replace(/\\prod/g,'∏')
    .replace(/\^2/g,'²').replace(/\^3/g,'³').replace(/\^4/g,'⁴').replace(/\^n/g,'ⁿ')
    .replace(/\^([0-9])/g,(_,n)=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(n)])
    .replace(/_([0-9])/g,(_,n)=>'₀₁₂₃₄₅₆₇₈₉'[parseInt(n)])
    .replace(/\\,/g,' ').replace(/\\;/g,' ').replace(/\\\\/g,' ')
    .replace(/[{}]/g,'').trim();
}

function applyMathPostProcess(container) {
  if (!container) return;
  let html = container.innerHTML;
  const before = html;
  // Block math \[...\]
  html = html.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, math) =>
    `<span class="ask-math-block">${convertLatexToUnicode(math)}</span>`
  );
  // Inline math \(...\)
  html = html.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, math) =>
    `<span class="ask-math-inline">${convertLatexToUnicode(math)}</span>`
  );
  if (html !== before) container.innerHTML = html;
}

// ── Persistent history store (survives panel open/close within app session) ─
const _historyStore = { messages: [] };

const SUGGESTED_QUESTIONS = [
  "Que vois-tu sur mon écran ?",
  "Résume la conversation",
  "Quelles sont les actions à retenir ?",
  "Explique ce qui vient d'être dit",
  "Qui parle en ce moment ?",
  "Quels sont les points clés ?",
  "Que faire après cette réunion ?",
  "Traduis le dernier passage",
  "Y a-t-il des décisions prises ?",
  "Donne-moi un résumé rapide",
];

export default function AskView() {
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [screenContext, setScreenContext] = useState(false);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  const [messages, setMessages] = useState(() => _historyStore.messages); // conversation history
  const [animatingChip, setAnimatingChip] = useState(null);
  const [maxMode, setMaxMode] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState(null); // null = unlimited
  const [proUnlocked, setProUnlocked] = useState(false);
  const [proHiding, setProHiding] = useState(false);
  // Cluely-style top tabs: Assist · What should I say? · Follow-up questions · Recap
  const [activeTab, setActiveTab] = useState('assist');

  const isQuotaExceededRef = useRef(false);
  const responseContainerRef = useRef(null);
  const textInputRef = useRef(null);
  const smdParserRef = useRef(null);
  const smdContainerRef = useRef(null);
  const lastProcessedLengthRef = useRef(0);
  const autoScrollEnabledRef = useRef(true);
  const isThrottledRef = useRef(false);
  const isResizingRef = useRef(false);
  const copyTimeoutRef = useRef(null);
  const markedRef = useRef(null);
  const hljsRef = useRef(null);
  const librariesLoadedRef = useRef(false);
  const suggestionTimerRef = useRef(null);

  const currentResponseRef = useRef('');
  const currentQuestionRef = useRef('');
  const isLoadingRef = useRef(false);
  const isStreamingRef = useRef(false);
  const justSavedRef = useRef(false); // prevent double-save between handleSendText and onAskStateUpdate

  useEffect(() => { _historyStore.messages = messages; }, [messages]);
  useEffect(() => { currentResponseRef.current = currentResponse; }, [currentResponse]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { isQuotaExceededRef.current = isQuotaExceeded; }, [isQuotaExceeded]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  injectStyles('ask-view-styles', CSS);

  // Rotating suggestions — use AI-generated ones when available, else static fallback
  const activeSuggestions = dynamicSuggestions.length >= 2 ? dynamicSuggestions : SUGGESTED_QUESTIONS;
  const visibleSuggestions = activeSuggestions.slice(suggestionOffset, suggestionOffset + 2).length === 2
    ? activeSuggestions.slice(suggestionOffset, suggestionOffset + 2)
    : activeSuggestions.slice(0, 2);

  useEffect(() => {
    const rotate = () => {
      setSuggestionsVisible(false);
      setTimeout(() => {
        setSuggestionOffset(prev => {
          const list = dynamicSuggestions.length >= 2 ? dynamicSuggestions : SUGGESTED_QUESTIONS;
          return (prev + 2) % list.length;
        });
        setSuggestionsVisible(true);
      }, 250);
    };
    suggestionTimerRef.current = setInterval(rotate, 3500);
    return () => clearInterval(suggestionTimerRef.current);
  }, [dynamicSuggestions]);

  const requestWindowResize = useCallback((targetHeight) => {
    if (!window.api) return;
    isResizingRef.current = true;
    if (document.querySelector('.mh-root.overlay-mode') || document.body.classList.contains('has-glass')) {
      window.dispatchEvent(new CustomEvent('local-panel-resize', { detail: { name: 'ask', width: 600, height: targetHeight } }));
    } else {
      window.api.askView.adjustWindowHeight(targetHeight);
    }
    setTimeout(() => { isResizingRef.current = false; }, 100);
  }, []);

  const adjustWindowHeight = useCallback(() => {
    if (!window.api) return;
    requestAnimationFrame(() => {
      const panelEl = document.querySelector('.ask-response-panel');
      const suggestEl = document.querySelector('.ask-suggestions');
      const barEl = document.querySelector('.ask-bar');
      const panelHeight = panelEl ? panelEl.offsetHeight : 0;
      const suggestHeight = suggestEl ? suggestEl.offsetHeight : 0;
      const barHeight = barEl ? barEl.offsetHeight : 0;
      const gap = panelEl ? 8 : 0;
      const idealHeight = panelHeight + gap + suggestHeight + barHeight + 4;
      // Quota overlay needs extra space so CTA is always fully visible
      const minHeight = isQuotaExceededRef.current ? 320 : 50;
      requestWindowResize(Math.min(700, Math.max(minHeight, idealHeight)));
    });
  }, [requestWindowResize]);

  const adjustWindowHeightThrottled = useCallback(() => {
    if (isThrottledRef.current) return;
    isThrottledRef.current = true;
    requestAnimationFrame(() => { adjustWindowHeight(); isThrottledRef.current = false; });
  }, [adjustWindowHeight]);

  const scrollToBottom = useCallback(() => {
    const container = document.querySelector('.ask-response-area') || responseContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, []);

  const focusTextInput = useCallback(() => {
    setTimeout(() => { if (textInputRef.current) textInputRef.current.focus(); }, 100);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        if (!window.marked) await loadScript('../../assets/marked-4.3.0.min.js');
        if (!window.hljs) await loadScript('../../assets/highlight-11.9.0.min.js');
        if (!window.DOMPurify) await loadScript('../../assets/dompurify-3.0.7.min.js');
        markedRef.current = window.marked;
        hljsRef.current = window.hljs;
        if (window.marked && window.hljs) {
          window.marked.setOptions({ highlight: (code, lang) => { if (lang && window.hljs.getLanguage(lang)) { try { return window.hljs.highlight(code, { language: lang }).value; } catch (e) {} } try { return window.hljs.highlightAuto(code).value; } catch (e) {} return code; }, breaks: true, gfm: true });
          librariesLoadedRef.current = true;
        }
      } catch (err) { console.error('Failed to load markdown libraries:', err); }
    };
    load();
  }, []);

  const resetStreamingParser = useCallback(() => {
    smdParserRef.current = null;
    smdContainerRef.current = null;
    lastProcessedLengthRef.current = 0;
  }, []);

  const renderStreamingMarkdown = useCallback((responseContainer) => {
    try {
      if (!smdParserRef.current) {
        responseContainer.innerHTML = '';
        const streamingContainer = document.createElement('div');
        streamingContainer.className = 'streaming-container';
        responseContainer.appendChild(streamingContainer);
        smdContainerRef.current = streamingContainer;
        smdParserRef.current = parser(default_renderer(streamingContainer));
        lastProcessedLengthRef.current = 0;
      }
      const currentText = currentResponseRef.current;
      const newText = currentText.slice(lastProcessedLengthRef.current);
      if (newText.length > 0) { parser_write(smdParserRef.current, newText); lastProcessedLengthRef.current = currentText.length; }
      if (!isStreamingRef.current && !isLoadingRef.current) {
        parser_end(smdParserRef.current);
        applyMathPostProcess(smdContainerRef.current);
      }
      if (hljsRef.current) {
        responseContainer.querySelectorAll('pre code').forEach(block => {
          if (!block.hasAttribute('data-highlighted')) { hljsRef.current.highlightElement(block); block.setAttribute('data-highlighted', 'true'); }
        });
      }
      if (autoScrollEnabledRef.current) {
        const scrollEl = document.querySelector('.ask-response-area') || responseContainer;
        requestAnimationFrame(() => { scrollEl.scrollTop = scrollEl.scrollHeight; });
      }
    } catch (err) { responseContainer.textContent = currentResponseRef.current || ''; }
  }, []);

  const renderContent = useCallback(() => {
    const container = responseContainerRef.current;
    if (!container) return;
    if ((isLoadingRef.current || isStreamingRef.current) && !currentResponseRef.current) {
      container.innerHTML = `<div class="ask-loading-dots"><div class="ask-loading-dot"></div><div class="ask-loading-dot"></div><div class="ask-loading-dot"></div></div>`;
      resetStreamingParser(); return;
    }
    if (!currentResponseRef.current) { container.innerHTML = ''; resetStreamingParser(); return; }
    renderStreamingMarkdown(container);
    adjustWindowHeightThrottled();
  }, [resetStreamingParser, renderStreamingMarkdown, adjustWindowHeightThrottled]);

  useEffect(() => { renderContent(); adjustWindowHeightThrottled(); }, [isLoading, currentResponse, isStreaming]);
  useEffect(() => {
    if (isQuotaExceeded) {
      // Scroll response panel to top so the quota overlay (position:absolute;inset:0) is visible
      const panel = document.querySelector('.ask-response-panel');
      if (panel) panel.scrollTop = 0;
      // Fire immediately and again after CSS min-height transition completes
      adjustWindowHeight();
      const t = setTimeout(() => adjustWindowHeight(), 420);
      return () => clearTimeout(t);
    }
  }, [isQuotaExceeded, adjustWindowHeight]);

  // Generate AI-contextual suggestions after response completes
  useEffect(() => {
    if (!isStreaming && !isLoading && currentResponse && currentQuestion && window.api?.askView?.generateSuggestions) {
      window.api.askView.generateSuggestions(currentQuestion, currentResponse)
        .then(suggestions => {
          if (suggestions && suggestions.length >= 2) {
            setDynamicSuggestions(suggestions);
            setSuggestionOffset(0);
          }
        })
        .catch(() => {});
    }
  }, [isStreaming, isLoading]);

  useEffect(() => {
    const container = document.querySelector('.ask-response-panel') || responseContainerRef.current?.closest?.('.ask-response-panel');
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      if (isResizingRef.current) return;
      adjustWindowHeightThrottled();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [currentResponse, adjustWindowHeightThrottled]);

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    };
    const handleScreenContextEvent = (e) => { setScreenContext(e.detail?.active ?? false); };
    const handleUserStateChanged = (_event, userState) => {
      if (!userState?.isLoggedIn) {
        window.dispatchEvent(new CustomEvent('local-panel-close', { detail: { name: 'ask' } }));
      }
    };

    document.addEventListener('keydown', handleEscKey);
    window.addEventListener('ask:setScreenContext', handleScreenContextEvent);
    window.api?.common?.onUserStateChanged?.(handleUserStateChanged);
    if (window.api) {
      window.api.askView.onShowTextInput(() => focusTextInput());
      window.api.askView.onScrollResponseUp(() => { const el = document.querySelector('.ask-response-panel') || responseContainerRef.current; if (el) el.scrollTop -= 100; });
      window.api.askView.onScrollResponseDown(() => { const el = document.querySelector('.ask-response-panel') || responseContainerRef.current; if (el) el.scrollTop += 100; });
      window.api.askView.onAskStateUpdate((event, newState) => {
        // When a new question arrives via action/IPC, save the current Q&A to history first
        // Skip if handleSendText already saved it (justSavedRef flag prevents duplicates)
        if (newState.isLoading && newState.currentQuestion && newState.currentQuestion !== currentQuestionRef.current) {
          if (currentQuestionRef.current && currentResponseRef.current && !justSavedRef.current) {
            const html = responseContainerRef.current?.innerHTML || '';
            setMessages(prev => [...prev, { question: currentQuestionRef.current, html }]);
          }
          justSavedRef.current = false;
        }
        setCurrentResponse(newState.currentResponse);
        setCurrentQuestion(newState.currentQuestion);
        setIsLoading(newState.isLoading);
        setIsStreaming(newState.isStreaming);
        setIsQuotaExceeded(newState.isQuotaExceeded || false);
        if (typeof newState.quotaRemaining === 'number') setQuotaRemaining(newState.quotaRemaining);
        focusTextInput();
        if (newState.isStreaming && autoScrollEnabledRef.current) setTimeout(() => scrollToBottom(), 0);
      });
    }
    setTimeout(() => adjustWindowHeight(), 200);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('ask:setScreenContext', handleScreenContextEvent);
      window.api?.common?.removeOnUserStateChanged?.(handleUserStateChanged);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (_event, { isPremium }) => {
      if (!isPremium) return;
      setIsQuotaExceeded(false);
      setProHiding(false);
      setProUnlocked(true);
      setTimeout(() => {
        setProHiding(true);
        setTimeout(() => { setProUnlocked(false); setProHiding(false); }, 420);
      }, 3000);
    };
    window.api?.common?.onProUnlocked?.(handler);
    return () => window.api?.common?.removeOnProUnlocked?.(handler);
  }, []);

  const hasResponse = isLoading || currentResponse || isStreaming;
  const hasContent = hasResponse || isQuotaExceeded;
  // Block when quota hits exactly 0. -1 = unlimited (Pro/Max), never block those.
  const isBlocked = isQuotaExceeded || (quotaRemaining !== null && quotaRemaining === 0);

  const handleSendText = useCallback(async (overridingText = '') => {
    if (isBlocked) return;
    const text = (overridingText || textInputRef.current?.value || '').trim();
    if (!text) return;
    // Save current Q&A to history before starting new question
    if (currentQuestionRef.current && currentResponseRef.current && !isLoadingRef.current && !isStreamingRef.current) {
      const html = responseContainerRef.current?.innerHTML || '';
      setMessages(prev => [...prev, { question: currentQuestionRef.current, html }]);
      justSavedRef.current = true; // prevent onAskStateUpdate from saving again
    }
    if (textInputRef.current) textInputRef.current.value = '';
    // Modes (Think/Search) persist across messages — user deactivates manually
    if (window.api) {
      // Pass conversation history so the AI has context of the current Ask session
      const historySnapshot = _historyStore.messages.map(m => ({ question: m.question, text: m.html?.replace(/<[^>]*>/g, '') || '' }));
      window.api.askView.sendMessage(text, { forceScreenshot: screenContext, maxMode, webSearch: webSearchMode }, historySnapshot).catch(err => console.error('Error sending text:', err));
    }
  }, [screenContext, isBlocked, maxMode, webSearchMode]);

  const handleTextKeydown = useCallback((e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  }, [handleSendText]);

  const copyText = useCallback(async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {}
  }, []);

  const handleClose = useCallback(() => {
    setIsQuotaExceeded(false);
    window.api?.askView?.closeAskWindow?.();
  }, []);

  const handleChipClick = useCallback((text) => {
    setAnimatingChip(text);
    setTimeout(() => {
      handleSendText(text);
      setAnimatingChip(null);
    }, 220);
  }, [handleSendText]);

  // Cluely-style tab quick-send handlers
  const handleTabAssist = useCallback(() => {
    setActiveTab('assist');
    handleSendText('Based on what\'s on my screen, infer and provide me with the best information to help me at the current moment.');
  }, [handleSendText]);
  const handleTabWhatSay = useCallback(() => {
    setActiveTab('whatsay');
    handleSendText('Que devrais-je dire ensuite ? Donne-moi uniquement les mots à dire.');
  }, [handleSendText]);
  const handleTabFollowup = useCallback(() => {
    setActiveTab('followup');
    handleSendText('Suggère deux questions de suivi que je peux poser pour faire avancer la conversation. Présente sous forme de deux points.');
  }, [handleSendText]);
  const handleTabRecap = useCallback(() => {
    setActiveTab('recap');
    handleSendText('Récapitule ce qui vient de se passer dans la conversation.');
  }, [handleSendText]);

  return (
    <div className="ask-view-root">

      {/* ── Cluely-style top tabs: Assist · What should I say? · Follow-up questions · Recap ── */}
      <div className="ask-top-tabs">
        <div
          className={`ask-tab-item${activeTab === 'assist' ? ' active' : ''}`}
          onClick={handleTabAssist}
        >
          {/* Sparkles icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z"/>
          </svg>
          Assister
        </div>
        <div className="ask-tab-dot" />
        <div
          className={`ask-tab-item${activeTab === 'whatsay' ? ' active' : ''}`}
          onClick={handleTabWhatSay}
        >
          {/* Wand icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/>
          </svg>
          Que dire ?
        </div>
        <div className="ask-tab-dot" />
        <div
          className={`ask-tab-item${activeTab === 'followup' ? ' active' : ''}`}
          onClick={handleTabFollowup}
        >
          {/* Message icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
          Questions
        </div>
        <div className="ask-tab-dot" />
        <div
          className={`ask-tab-item${activeTab === 'recap' ? ' active' : ''}`}
          onClick={handleTabRecap}
        >
          {/* Rotate icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Récap
        </div>
      </div>

      {hasContent && (
        <div
          className={`ask-response-panel${isQuotaExceeded ? ' quota-exceeded' : ''}`}
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: isQuotaExceeded ? 'hidden' : undefined,
          }}
        >
          {/* Conversation history */}
          {messages.map((msg, i) => (
            <div key={i} className="ask-history-entry">
              <div className="ask-question-area">
                <button
                  className={`ask-bubble-copy${copiedId === `q-${i}` ? ' copied' : ''}`}
                  onClick={() => copyText(`q-${i}`, msg.question)}
                  title="Copier"
                >
                  <svg className="copy-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  <svg className="check-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </button>
                <div className="ask-question-bubble">{msg.question}</div>
              </div>
              <div className="ask-history-response" dangerouslySetInnerHTML={{ __html: msg.html }} />
            </div>
          ))}

          {/* Current Q+A */}
          {currentQuestion && (
            <div className="ask-question-area">
              <button
                className={`ask-bubble-copy${copiedId === 'current-q' ? ' copied' : ''}`}
                onClick={() => copyText('current-q', currentQuestion)}
                title="Copier"
              >
                <svg className="copy-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                <svg className="check-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
              <div className="ask-question-bubble">{currentQuestion}</div>
            </div>
          )}

          {/* Response area (always rendered so blurred content shows behind overlay) */}
          <div className={`ask-response-area${hasResponse ? ' visible' : ''}`}>
            <div id="askResponseContainer" ref={responseContainerRef} />
            {currentResponse && !isStreaming && !isQuotaExceeded && (
              <div className="ask-response-footer">
                <button
                  className={`ask-response-copy${copiedId === 'current-r' ? ' copied' : ''}`}
                  onClick={() => copyText('current-r', currentResponse)}
                  title="Copier la réponse"
                >
                  <svg className="copy-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  <svg className="check-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Frosted paywall overlay — sits on top of blurred content */}
          {isQuotaExceeded && (
            <div className="ask-quota-overlay">
              <div className="ask-quota-cta">
                <div className="ask-quota-title">Limite quotidienne atteinte</div>
                <div className="ask-quota-sub">Passez à Pro pour des réponses illimitées avec Claire</div>
                <button
                  className="ask-quota-btn"
                  onClick={() => window.api?.common?.openExternal?.('https://app.clairia.app/settings/billing')}
                >
                  Passer à Pro →
                </button>
                <div className="ask-quota-wait">Réessayez demain</div>
              </div>
            </div>
          )}

          {/* Pro unlocked — Apple-style welcome overlay */}
          {proUnlocked && (
            <div className={`ask-pro-overlay${proHiding ? ' hiding' : ''}`}>
              <div className="ask-pro-icon-wrap">
                <span className="ask-pro-icon-inner">✦</span>
              </div>
              <div className="ask-pro-title">Bienvenue dans Claire Pro</div>
              <div className="ask-pro-sub">Réponses illimitées, maintenant actives</div>
              <div className="ask-pro-badge">Pro</div>
            </div>
          )}
        </div>
      )}

      {!hasContent && (
        <div className="ask-suggestions" style={{ opacity: suggestionsVisible ? 1 : 0, transition: 'opacity 0.25s ease' }}>
          {visibleSuggestions.map((q, i) => (
            <div
              key={`${suggestionOffset}-${i}`}
              className={`ask-suggestion-chip${animatingChip === q ? ' sending' : ''}`}
              onClick={() => handleChipClick(q)}
            >
              {q}
            </div>
          ))}
        </div>
      )}

      <div className="ask-bar">
        {/* Input row */}
        <div className="ask-bar-input-row">
          <input
            type="text"
            className="ask-text-input"
            placeholder={isBlocked ? "Limite atteinte — Passez à Pro" : "Posez votre question…"}
            ref={textInputRef}
            onKeyDown={handleTextKeydown}
            disabled={isBlocked}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="none"
            data-lpignore="true"
            data-form-type="other"
            style={isBlocked ? { opacity: 0.35, cursor: 'default' } : undefined}
          />
        </div>
        {/* Footer row: Smart · modes · send — matches Cluely layout */}
        <div className="ask-bar-footer">
          <div className="ask-bar-footer-left">
            {/* "Smart" mode indicator */}
            <button
              className={`ask-smart-label${maxMode ? ' active' : ''}`}
              style={isBlocked ? { opacity: 0.32, cursor: 'default' } : undefined}
              onClick={() => !isBlocked && setMaxMode(prev => !prev)}
              title="Mode Réflexion"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6M10 22h4"/><path d="M15 14c.2-1 .7-1.7 1.5-2.5A5 5 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5"/>
              </svg>
              Smart
            </button>
          </div>
          <div className="ask-bar-footer-right">
            {/* Web search button */}
            <button
              className={`ask-web-btn${webSearchMode ? ' active' : ''}`}
              title="Recherche web"
              disabled={isBlocked}
              style={isBlocked ? { opacity: 0.32, cursor: 'default' } : undefined}
              onClick={() => !isBlocked && setWebSearchMode(prev => !prev)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
              </svg>
            </button>
            {/* Ellipsis — more actions (Cluely: "Open more chat actions") */}
            <button className="ask-more-btn" title="Plus d'options">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
            {/* Send button — Cluely: rounded-full bg-[linear-gradient(#0544a9,#022c70)] */}
            <button
              className="ask-send-btn"
              onClick={() => handleSendText()}
              disabled={isBlocked}
              style={isBlocked ? { opacity: 0.30, cursor: 'default' } : undefined}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
