# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Build

```bash
# Renderer only — most common (overlay pill + AskView + dashboard Next.js)
npm run build:ui

# Full build (renderer + web + Electron packaging)
npm run build
```

**The user ALWAYS launches builds manually. Never run builds automatically.**

- Changes in `src/ui/react/*.jsx` → require `npm run build:ui`
- Changes in `apps/renderer/**` (Next.js dashboard) → require `npm run build:ui`
- Changes in `src/` (main process, IPC) → require app restart, no rebuild needed

---

## Architecture

### Trois fenêtres Electron

| Fenêtre | Rôle | Fichiers clés |
|---------|------|---------------|
| **Splash** | Boot loader 360×500, `alwaysOnTop: true`, opaque | `src/ui/splash/splash.html`, `src/window/windowManager.js` |
| **Overlay** | Fullscreen transparent — contient pill + AskView + ListenView | `src/ui/react/OverlayRoot.jsx`, `src/ui/react/MainHeader.jsx` |
| **Dashboard** | Next.js app — `/activity`, `/settings`, etc. | `apps/renderer/app/**`, `src/window/windowReconciler.js` |

### Boot sequence

```
bootApp()
  └── sharedStateService.patch({ showHeader: false, showListen: false,
                                  showChat: false, showDashboard: false })
  └── createSplashWindow() → show splash
  └── createDashboardWindow({ skipAutoShow: true }) → preload en arrière-plan
  └── _resolveBoot()
        ├── closeSplashWindow()
        ├── setTimeout(700ms)  ← desktop gap (splash → dashboard)
        └── dash.setOpacity(0) → dash.show() → setTimeout(30ms) → setOpacity(1)
```

**Anti-flash pattern** — toujours utiliser cette séquence pour afficher une fenêtre sans flash blanc :
```js
win.setOpacity(0);
win.show();
setTimeout(() => { if (!win.isDestroyed()) { win.setOpacity(1); } }, 30);
```

### SharedState IPC

`sharedStateService.patch(delta)` → broadcast à tous les renderers → `windowReconciler.js` réagit pour show/hide les fenêtres.

Champs critiques : `showHeader`, `showDashboard`, `showListen`, `showChat`, `isListenRunning`, `session`, `lastSessionId`, `dashboardFocusCount`.

**Important** : patcher `{ showHeader: false, showListen: false, showChat: false, showDashboard: false }` au démarrage de `bootApp()` pour éviter le cold start (pill qui apparaît avant que le dashboard se ferme).

### Pattern IPC strict

```js
// 1. Main — featureBridge.js ou windowBridge.js
ipcMain.handle('feature:action', async (event, ...args) => { … });

// 2. Preload — preload.js
window.api.feature = {
  action: (...args) => ipcRenderer.invoke('feature:action', ...args),
};

// 3. React
await window.api.feature.action(…);
```

Ne jamais utiliser `ipcRenderer.send` / `ipcMain.on` pour du request-response.

### Modes de rendu des panels

- **Overlay mode** (production) : fenêtre fullscreen transparente unique. `OverlayRoot.jsx` positionne tous les panels via `computeLayout()`.
- **Window mode** : chaque panel dans sa propre fenêtre OS.

En overlay mode, **ne jamais appeler** `window.api.askView.adjustWindowHeight()` directement :
```js
// ✅ Correct
window.dispatchEvent(new CustomEvent('local-panel-resize', {
  detail: { name: 'ask', width: 600, height: targetHeight }
}));
```

### Événements DOM custom (communication intra-overlay)

| Événement | Sens | Rôle |
|-----------|------|------|
| `ask:setScreenContext` | MainHeader → AskView | Active/désactive le contexte écran |
| `local-panel-close` | Panel → OverlayRoot | Ferme un panel |
| `local-panel-resize` | Panel → OverlayRoot | Redimensionne un panel |

### Navigation dashboard

Toujours utiliser `router.push()` (pas `router.replace`) pour naviguer vers les sessions — `push` ajoute à l'historique Electron WebContents et permet au bouton retour de fonctionner.

Avant de naviguer vers une session via `onNavigateToSession`, vérifier que l'URL courante ne contient pas déjà le `sessionId` pour éviter le re-mount :
```ts
const current = window.location.pathname + window.location.search;
if (!current.includes(id)) router.push(`/activity/details?sessionId=${id}&new=1`);
```

---

## Design system

### Background glass (identique sur tous les panels)

```css
background: rgba(11,11,14,0.88);
backdrop-filter: blur(28px) saturate(190%);
-webkit-backdrop-filter: blur(28px) saturate(190%);
border-radius: 16px;
border: 1px solid rgba(255,255,255,0.09);
box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset;
```

### Bleu Cluely (boutons d'action, bulles question)

```css
background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%);
color: #CBE3FF;
box-shadow: 0 0 0 .678px #0c44a1, inset 0 -1.355px #022c70, inset 0 .678px #81b6ff;
```

### Fonts

- Ask / Settings : `'Plus Jakarta Sans', -apple-system, sans-serif`
- Listen : `'Helvetica Neue', -apple-system, sans-serif`
- Splash / boot : `'Geist Variable', sans-serif`

### Référence dimensions Cluely (v2.0.186)

Extraits du ASAR installé — servir de référence pour la parité visuelle :

| Élément | Dimensions |
|---------|-----------|
| Pill / control bar | **163×50px**, centré horizontalement, 25px du bord bas |
| Chat panel (Ask) | **540px** de large, hauteur dynamique |
| Dashboard (Mac) | **1050×700px** |
| Dashboard (Windows) | **1100×720px** |

Les prompts IA de Cluely sont **côté serveur** (`api.v2.cluely.com`) — pas dans l'ASAR. Impossible à extraire.

---

## Décisions techniques

### STT
AssemblyAI est le provider par défaut. `modelStateService.js` force la re-sélection si une clé AssemblyAI est présente et que le provider actuel est différent.

### LLM
Ordre de priorité : **Anthropic > Gemini > OpenAI > autres** — configuré dans `modelStateService.js`.

### Langue des réponses IA
Injection systématique à la fin de `enhancedSystemPrompt` dans `askService.js` :
```js
enhancedSystemPrompt += '\n\n⚠️ RÈGLE ABSOLUE : Tu dois TOUJOURS répondre en français, peu importe la langue de la question. Ne réponds JAMAIS en anglais.';
```
Ne pas compter uniquement sur le template `claire_analysis` — `formatRequirements` est en anglais et peut surcharger l'instruction française.

### Suggestions contextuelles
Après chaque réponse Ask, appel LLM (claude-haiku → OpenAI fallback) via `ask:generateSuggestions` dans `featureBridge.js`. Génère 2 questions en français. Rotation toutes les 2 s.

### Historique Ask
Les Q&A s'accumulent dans `messages[]` local à `AskView`. La réponse courante est sauvegardée (avec son HTML rendu) avant chaque nouvelle question. Effacé à la fermeture du panel.

### Email → navigateur externe
Toujours utiliser `window.api.openExternal(url)` pour ouvrir Gmail (ou tout lien externe) — déclenche `shell.openExternal` dans le main process et ouvre un vrai onglet Chrome.  
Ne pas utiliser le trick `a.click()` — bloqué par les popup blockers après les calls async.

---

## Bugs connus / ouverts

### Logo dans la pill — repositionnement (OPEN)
**Symptôme** : le logo apparaît coupé en bas au rendu initial, puis se recentre (~100ms plus tard).  
**Tentative** : remplacement `<img src="logo.svg">` par un composant SVG inline `<ClaireMark />` pour éliminer le délai de chargement asynchrone. Bug persiste — cause exacte non résolue.  
**Piste** : probable conflit entre `flex-shrink: 0` + `margin-right: auto` et le layout initial de `.mh-controls` avant que les dimensions soient calculées.  
**Fichier** : `src/ui/react/MainHeader.jsx` — composant `ClaireMark`, CSS `.mh-logo`.

---

## Pièges à éviter

**`body.has-glass` CSS bypass** — ne pas l'utiliser ni l'étendre :
```css
/* ❌ Supprime backgrounds, animations, backdrop-filter */
body.has-glass .mon-composant { background: transparent !important; }
```
Pattern hérité encore présent dans `ListenView.jsx` mais retiré de `AskView`.

**`overflow: hidden` sans `borderRadius` dans `OverlayRoot`** — `panelStyle` doit inclure `borderRadius: 16`, sinon les coins arrondis intérieurs apparaissent comme des "piques".

**Streaming markdown** — utiliser le pipeline `parser` / `parser_write` / `parser_end` / `default_renderer` de `smd.js`. Ne jamais écrire dans `innerHTML` directement pendant le streaming.

**Chemin des assets** — la base URL est `src/ui/app/content.html` :
```
✅  ../assets/logo.png
❌  ../../assets/logo.png
```

**`isLiveSession` scope** — doit être défini au niveau du composant (avant `renderContent`), pas redéfini dans chaque fonction locale. Utilisé pour le titre shimmer, l'état "Terminez la session", et le champ titre `readOnly`.

---

## Conventions React (overlay UI)

```js
// Style scopé — injecté une seule fois par composant
const injectStyles = (id, css) => {
  if (!document.getElementById(id)) { … }
};
injectStyles('mon-composant-styles', CSS);

// Refs pour valeurs mutables dans callbacks (évite stale closures)
const isLoadingRef = useRef(false);
useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
```

---

## Agent Directives

Rules that override default Claude behavior for this codebase.

**1. Read before edit.** Re-read any file before editing it. After 10+ messages, auto-compaction may have destroyed context. Edit against stale state = silent breakage.

**2. Verify after edit.** After every file write, confirm the change applied. The Edit tool reports success even when `old_string` didn't match.

**3. No auto-build.** Never run `npm run build` or `npm run build:ui`. The user always triggers builds manually.

**4. Phased execution.** Multi-file refactors must be broken into explicit phases (max 5 files each). Complete Phase 1, wait for approval, then Phase 2.

**5. Type-check before declaring done.** Run `npx tsc --noEmit` after any TypeScript change. Fix all errors before reporting completion. If no type-checker exists, say so explicitly.

**6. Sub-agent swarming.** Tasks touching >5 independent files → launch parallel sub-agents. Sequential processing of large tasks guarantees context decay.

**7. Grep exhaustively on renames.** When renaming any symbol, search for: direct calls, type references, string literals, dynamic imports, re-exports, test files. A single grep is never enough.

**8. No dead code accumulation.** Before any structural refactor on a file >300 LOC, first remove dead props, unused exports, unused imports, debug logs. Commit cleanup separately.

**9. IPC pattern is strict.** Always `ipcMain.handle` + `ipcRenderer.invoke`. Never `send`/`on` for request-response. Always expose through `preload.js` — never import electron directly in renderer.

**10. Overlay resize via events.** In overlay mode, never call `adjustWindowHeight()` directly. Always dispatch `local-panel-resize` custom event.
