# CLAUDE.md — Claire Engineering Rules

## Project Context

You are working on Claire, an Electron/React/Next.js desktop app.

Local repository:
```txt
C:\Users\somen\Desktop\glass-main
```

Local Cluely reference:
```txt
C:\Users\somen\Desktop\cluely findr
```

Use the local Cluely extraction only when the task explicitly asks for Cluely comparison or behavior matching. Do not browse GitHub or the web for Cluely unless the user explicitly asks.

Claire has these major layers:
```txt
Electron main process
Renderer / dashboard
Overlay / floating bar
sharedStateService
windowReconciler
Listen / STT
Summary
Ask
Settings
Billing/Auth/Calendar integrations
```

Target architecture:
```txt
Renderer asks for an action
→ preload exposes a safe API
→ ipcMain handler receives the request
→ main process/service orchestrates
→ sharedStateService.patch() updates canonical runtime state
→ windowReconciler applies effects
→ renderer updates from state/events
```

Do not create random parallel state systems.

---

## Prime Directive

Be conservative with existing working behavior.

When changing code:

- Read the relevant files first.
- Identify the real cause before editing.
- Make the smallest complete fix.
- Avoid touching unrelated areas.
- Do not claim a visual bug is fixed until the user confirms it.
- Stop after each coherent unit of work and report clearly.

The user prefers direct, critical, non-yes-man engineering judgment.

---

## Hard Rules

### Builds

Do not run full builds automatically.

Forbidden unless the user explicitly asks:
```bash
npm run build:ui
npm run build
npm run dist
npm run package
npx electron-builder
```

Allowed when useful:
```bash
git status --short
git branch --show-current
git log --oneline -5
git diff --check
node --check path\to\file.js
```

The user normally runs the app and build manually.

### Git

Before starting any task, inspect:
```bash
git status --short
git branch --show-current
git log --oneline -5
```

- Do not overwrite uncommitted user changes.
- Do not commit or push unless the user explicitly authorizes it in the current task/thread.
- If the user says auto-push is allowed for a specific branch/task, you may push after a clean commit report. Do not assume permanent global auto-push.

Branch names:
```txt
fix/<short-bug>
refactor/<short-area>
polish/<short-ui-area>
```

### Scope

Do not mix unrelated changes.

Bad:
```txt
Fix STT + refactor settings + change UI + alter overlay timing
```

Good:
```txt
Fix one bug, in one layer, with a clear rollback.
```

### No fake features

No fake buttons, fake API handlers, fake success messages, or dead UI.

A feature must be one of:
```txt
functional
disabled with honest copy
hidden
```

Examples:
```txt
Dead billing button → disabled or wired to Stripe
Fake email update → disabled or real Firebase flow
Mic selector not connected to STT → rename to "Test du microphone par défaut"
Unavailable setting → disabled with "Bientôt disponible"
```

---

## Protected Areas

Modify these only when directly required:
```txt
src/window/windowManager.js
src/ui/react/OverlayRoot.jsx
src/ui/react/MainHeader.jsx
src/window/windowReconciler.js
src/common/services/sharedStateService.js
```

The floating bar visual design is accepted unless the user says otherwise. Do not restyle it casually.

Viewed screen / Écran consulté is accepted unless the user reports a regression. Do not modify it casually.

---

## Core Architecture Rules

### sharedStateService

`sharedStateService` is the central runtime state mechanism.

Good:
```js
sharedStateService.patch({
  showDashboard: false,
  showHeader: true,
});
```

Bad:
```js
// local renderer state pretends to be the global truth
setIsSessionRunning(true);
```

Do not duplicate global runtime state in React if it should be shared across windows.

### windowReconciler

`windowReconciler` applies shared state to windows and runtime side effects.

If a window appears too early, flashes, or ignores state, inspect this chain before touching UI:
```txt
sharedStateService
windowReconciler
windowManager
OverlayRoot / renderer hydration
```

### IPC

Preferred pattern:
```txt
renderer → preload window.api.* → ipcRenderer.invoke → ipcMain.handle → service/action
```

A preload method must map to real main-process logic.

Good:
```js
window.api.app.startClaire = () => ipcRenderer.invoke('app:startClaire');
```

Bad:
```js
window.api.settings.update = async () => ({ success: true }); // fake stub
```

Legacy APIs may exist temporarily, but they should delegate to canonical handlers.

### Runtime action files

Use runtime action files only when they reduce dispersion:
```txt
src/runtime/settingsActions.js
src/runtime/sessionActions.js
src/runtime/appActions.js
```

They must orchestrate existing services and `sharedStateService`. They must not create a competing source of truth.

---

## Electron / Window Patterns

### Anti-flash dashboard reveal pattern

When revealing a BrowserWindow that may flash black/white:
```js
win.setOpacity(0);
win.show();
setTimeout(() => {
  if (!win.isDestroyed()) win.setOpacity(1);
}, 30);
```

Use only when appropriate; do not hide logic bugs with opacity.

### Overlay first-render rule

Overlay must not show visible UI before runtime visibility is known.

Correct pattern:
```txt
BrowserWindow created with show:false
renderer loads
sharedState visibility hydrated
overlay:panel-visibility applied
only then show if showHeader || showListen || showChat
```

Never rely on `OverlayRoot` rendering `header:true` by default.

### Splash / boot sequencing

Splash and dashboard must be sequenced deliberately.

Avoid:
```txt
dashboard visible under splash unintentionally
splash closing before dashboard is ready
black/white flashes
double show/focus calls
```

Preferred boot handoff concept:
```txt
dashboard created hidden
dashboard ready
splash exit animation starts
wait exit animation / controlled timeout
splash destroyed
dashboard revealed with anti-flash pattern
```

---

## Overlay / Custom Events

Important renderer/main events used in this repo may include:
```txt
local-panel-resize
local-panel-close
ask:setScreenContext
overlay:panel-visibility
shared-state:updated
session:updated
settings:updated
```

Before replacing any event, search its usage. Do not rename events casually.

For overlay panels, do not call native window resize/show/hide directly from React if the repo already routes through `local-panel-resize` or shared state.

---

## UI Rules

### General

Avoid:
```txt
layout shifts
flicker
changing accepted visual components
animations that hide logic bugs
overusing blur/shimmer
```

Prefer:
```txt
opacity / transform animations
stable dimensions
simple state machines
clear loading/error/empty states
prefers-reduced-motion
```

### Floating bar

Do not visually change the floating bar unless explicitly asked.
If there is a timing issue, fix lifecycle/visibility logic, not CSS.

Reference dimensions if matching Cluely is explicitly requested:
```txt
Floating pill target: around 163×50
```

Only use exact values after confirming from current code or local Cluely extraction.

### Ask / Chat panel

If matching Cluely is explicitly requested, inspect local Cluely assets first.

Common reference targets:
```txt
Ask/chat panel width around 540px
dark glass background
compact footer
stable input height
no flicker on textarea focus
```

Do not modify Viewed screen / Écran consulté unless asked.

### Dashboard

Reference target if matching Cluely is explicitly requested:
```txt
Dashboard around 1050×700 or 1100×720 depending current implementation
stable first paint
no black/white boot flash
no layout jump during session updates
```

---

## Design Tokens / Visual Consistency

Do not invent new design language casually.

When adding UI, prefer existing tokens/classes already used in the repo. If you must define values, keep them consistent with current Claire/Cluely-like style:
```txt
dark glass surfaces
subtle borders
stable rounded panels
low-noise shadows
compact spacing
```

Example glass baseline used historically in this project:
```css
background: rgba(11, 11, 14, 0.88);
backdrop-filter: blur(18px) saturate(1.2);
border: 1px solid rgba(255, 255, 255, 0.08);
```

Do not add random gradients unless the task is explicitly UI polish.

### Font — Geist EVERYWHERE

The ONLY font allowed in this project is **Geist** (Geist Variable / Geist Sans).

This applies to:
```txt
overlay (pill, AskView, ListenView)
dashboard Next.js (/activity, /settings, all routes)
splash
modals, settings panels, toasts
buttons, inputs, labels, code blocks
all renderers — no exception
```

Forbidden:
```txt
Plus Jakarta Sans
Helvetica Neue
SF Pro / -apple-system
Inter
Arial / sans-serif fallback alone
any other named font
```

Correct usage:
```css
font-family: 'Geist Variable', 'Geist', sans-serif;
```

When editing any file with `font-family` or `fontFamily`, replace the existing value with Geist. Never reintroduce another font even "just for one component".

---

## Settings Rules

Settings are not just UI. A setting must have a clear lifecycle:
```txt
Settings UI
→ persistence if needed
→ runtime/shared state
→ real service consumer
```

If no consumer exists, do not make it look functional.

### Language settings

Never pass UI labels into services.

Bad:
```txt
Français (recommandé)
English
Español
```

Good:
```txt
fr
en
es
de
it
pt
```

Typical mappings:
```txt
detectable → contentProtectionEnabled = !detectable
screenUse → screenContextEnabled
transcriptionLang → transcriptionLanguage
outputLang → outputLanguage
autoMeetingDetection → autoMeetingDetectionEnabled
colorTheme → theme
```

---

## STT / AI / Summary Rules

### Provider defaults

Do not change provider order or STT provider without reading current code and confirming with the user.
If the repo has an explicit provider fallback order, preserve it.

Historical target decisions in this project may include:
```txt
AssemblyAI as default STT provider
French as default output/user-facing language
```

Verify in code before editing.

### STT

STT must not silently ignore user settings.

Use runtime language settings when available:
```js
const languageCode = state.transcriptionLanguage || 'fr';
```

Filter obvious transcript noise before it pollutes summaries.

### Summary

Summary must be robust if memory or auxiliary services fail.
Final summary should not depend on Memory API being available.

### Ask

Ask should consume:
```txt
active session context when relevant
output language setting
screen context setting
```

Do not break Viewed screen behavior unless the task is specifically about Viewed screen.

---

## Error Handling

Live features should degrade gracefully.

Good:
```txt
Memory API down → log once/throttled → continue session
STT provider error → surface clear failure → recover UI
Settings endpoint missing → disable feature, do not fake success
```

Bad:
```txt
throw inside transcript flow and break Listen
spam logs on every transcript
hide failures behind fake success
```

Use throttled logs for repetitive failures.

Avoid unhandled promise rejections:
```js
void doAsyncThing().catch((error) => logger.warn(...));
```

---

## Known Quirks / Check First

Before fixing these, inspect current code and confirm the issue still exists.
```txt
Overlay/floating bar first-render flash
Splash exit / dashboard reveal overlap
Logo in floating pill may differ between runtime/taskbar/local assets
Settings controls may be UI-only or partially wired
Memory API may be unavailable and must remain best-effort
session title fallbacks may conflict between /activity and /activity/details
```

Do not assume a known quirk still exists if recent commits fixed it.

---

## Execution Discipline

### Rule 6 — Phased execution & sub-agent swarming

Multi-file work must be structured, never freeform.

**Phased execution (sequential):**
- Refactors or rules-rollouts must be broken into explicit phases of **max 5 files** each.
- Complete one phase, report cleanly, wait for user approval, then start the next.
- Never bundle "all the changes" into a single mega-edit pass.

**Sub-agent swarming (parallel):**
- Tasks touching **>5 independent files** → launch parallel sub-agents (one Agent call per group, all in the same message).
- Each sub-agent gets a tight, self-contained brief: exact files, exact change, exact verification.
- Sequential single-threaded processing of large tasks guarantees context decay and is forbidden when work is parallelizable.

**Pre-rollout cleanup:**
- Before any structural refactor on a file >300 LOC, first remove dead props/exports/imports/debug logs. Commit that cleanup separately.

**Type-check gate:**
- After any TypeScript change, run `npx tsc --noEmit` and fix every error before reporting completion.
- If a project area has no type-checker, state so explicitly in the Work Completed report.

**Grep exhaustively on renames:**
- When renaming any symbol/event/file: search direct calls, type references, string literals, dynamic imports, re-exports, test files. One grep is never enough.

---

## Working Process

### Before coding

Respond with:
```txt
## Audit / Plan

Task:
Files read:
Current behavior:
Root cause:
Proposed change:
Files to modify:
Files not to touch:
Risks:
Rollback:
Manual tests:
Waiting for approval:
```

### After coding

Respond with:
```txt
## Work completed

Files created:
Files modified:
Old logic removed:
New logic:
Why this is safer/cleaner:
Checks run:
Risks:
Rollback:
Manual tests for user:
Next recommended step:
```

---

## Local Cluely Reference

Use local search only:
```txt
C:\Users\somen\Desktop\cluely findr
```

Useful search terms:
```txt
get-shared-state
patch-shared-state
shared-state-updated
BrowserWindow
show: false
dashboard
control
session
settings
```

Use Cluely as a conceptual reference for state flow and polish, not as code to copy.
Do not copy proprietary code.

---

## If Unsure

Do not guess.
Say what is unclear, what you inspected, and what must be verified.
Prefer a narrow audit over speculative code.
