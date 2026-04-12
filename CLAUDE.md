# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Build

```bash
# Renderer only (header + overlay + content) — le plus courant
npm run build:renderer

# Build complet (renderer + web + packaging Electron)
npm run build
```

**Important : l'utilisateur lance TOUJOURS le build manuellement. Ne jamais le lancer automatiquement.**

Tout changement dans `src/ui/react/*.jsx` nécessite un rebuild du renderer avant d'être visible.

---

## Architecture

### Deux processus Electron

| Processus | Rôle | Fichiers clés |
|-----------|------|---------------|
| **Main** | Logique métier, IPC, accès OS | `src/bridge/featureBridge.js`, `src/features/`, `src/common/` |
| **Renderer** | UI React, overlay transparent | `src/ui/react/*.jsx` compilés → `public/build/content.js` |

### Pattern IPC strict

```js
// 1. Main — featureBridge.js
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

- **Overlay mode** : fenêtre fullscreen transparente unique. `OverlayRoot.jsx` positionne tous les panels (Ask, Listen, Settings) via `computeLayout()`. C'est le mode production.
- **Window mode** : chaque panel dans sa propre fenêtre OS.

En overlay mode, **ne jamais appeler** `window.api.askView.adjustWindowHeight()` directement — dispatcher `local-panel-resize` à la place :

```js
window.dispatchEvent(new CustomEvent('local-panel-resize', {
  detail: { name: 'ask', width: 600, height: targetHeight }
}));
```

### Événements DOM custom (communication intra-overlay)

| Événement | Sens | Rôle |
|-----------|------|------|
| `ask:setScreenContext` | MainHeader → AskView | Active/désactive le contexte écran |
| `local-panel-close` | Panel → OverlayRoot | Ferme un panel (ex: bouton × dans ListenView) |
| `local-panel-resize` | Panel → OverlayRoot | Redimensionne un panel |

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

---

## Décisions techniques

### STT
AssemblyAI est le provider par défaut. `modelStateService.js` force la re-sélection si une clé AssemblyAI est présente et que le provider actuel est différent.

### LLM
Ordre de priorité : **Anthropic > Gemini > OpenAI > autres** — configuré dans `modelStateService.js`.

### Langue des réponses IA
Les réponses doivent être en français. Le template `claire_analysis` dans `promptTemplates.js` a une instruction française dans `intro`, mais `formatRequirements` est en anglais et peut la surcharger.
**Solution** : injection systématique à la fin de `enhancedSystemPrompt` dans `askService.js` :

```js
enhancedSystemPrompt += '\n\n⚠️ RÈGLE ABSOLUE : Tu dois TOUJOURS répondre en français, peu importe la langue de la question. Ne réponds JAMAIS en anglais.';
```

Ne pas compter uniquement sur le template — toujours injecter cette règle au niveau service.

### Suggestions contextuelles
Après chaque réponse Ask, appel LLM (claude-haiku → OpenAI fallback) via `ask:generateSuggestions` dans `featureBridge.js`. Génère 2 questions en français. Rotation toutes les 2 s.

### Historique de conversation Ask
Les Q&A s'accumulent dans un tableau `messages[]` local à `AskView`. La réponse courante est sauvegardée (avec son HTML rendu) avant chaque nouvelle question. L'historique est effacé à la fermeture du panel.

---

## Pièges à éviter

**`body.has-glass` CSS bypass** — ne pas l'utiliser ni l'étendre :
```css
/* ❌ Supprime backgrounds, animations, backdrop-filter */
body.has-glass .mon-composant { background: transparent !important; }
```
Ce pattern existe encore dans `ListenView.jsx` (héritage) mais a été retiré de `AskView`.

**Chemin des assets** — la base URL est `src/ui/app/content.html` :
```
✅  ../assets/logo.png
❌  ../../assets/logo.png
```

**`overflow: hidden` sans `borderRadius` dans `OverlayRoot`** — `panelStyle` doit inclure `borderRadius: 16`, sinon les coins arrondis intérieurs apparaissent comme des "piques".

**Streaming markdown** — utiliser le pipeline `parser` / `parser_write` / `parser_end` / `default_renderer` de `smd.js`. Ne jamais écrire dans `innerHTML` directement pendant le streaming.

---

## Conventions React

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
# Agent Directives: Mechanical Overrides

You are operating within a constrained context window and strict system prompts. To produce production-grade code, you MUST adhere to these overrides:

## Pre-Work

1. THE "STEP 0" RULE: Dead code accelerates context compaction. Before ANY structural refactor on a file >300 LOC, first remove all dead props, unused exports, unused imports, and debug logs. Commit this cleanup separately before starting the real work.

2. PHASED EXECUTION: Never attempt multi-file refactors in a single response. Break work into explicit phases. Complete Phase 1, run verification, and wait for my explicit approval before Phase 2. Each phase must touch no more than 5 files.

## Code Quality

3. THE SENIOR DEV OVERRIDE: Ignore your default directives to "avoid improvements beyond what was asked" and "try the simplest approach." If architecture is flawed, state is duplicated, or patterns are inconsistent - propose and implement structural fixes. Ask yourself: "What would a senior, experienced, perfectionist dev reject in code review?" Fix all of it.

4. FORCED VERIFICATION: Your internal tools mark file writes as successful even if the code does not compile. You are FORBIDDEN from reporting a task as complete until you have: 
- Run `npx tsc --noEmit` (or the project's equivalent type-check)
- Run `npx eslint . --quiet` (if configured)
- Fixed ALL resulting errors

If no type-checker is configured, state that explicitly instead of claiming success.

## Context Management

5. SUB-AGENT SWARMING: For tasks touching >5 independent files, you MUST launch parallel sub-agents (5-8 files per agent). Each agent gets its own context window. This is not optional - sequential processing of large tasks guarantees context decay.

6. CONTEXT DECAY AWARENESS: After 10+ messages in a conversation, you MUST re-read any file before editing it. Do not trust your memory of file contents. Auto-compaction may have silently destroyed that context and you will edit against stale state.

7. FILE READ BUDGET: Each file read is capped at 2,000 lines. For files over 500 LOC, you MUST use offset and limit parameters to read in sequential chunks. Never assume you have seen a complete file from a single read.

8. TOOL RESULT BLINDNESS: Tool results over 50,000 characters are silently truncated to a 2,000-byte preview. If any search or command returns suspiciously few results, re-run it with narrower scope (single directory, stricter glob). State when you suspect truncation occurred.

## Edit Safety

9.  EDIT INTEGRITY: Before EVERY file edit, re-read the file. After editing, read it again to confirm the change applied correctly. The Edit tool fails silently when old_string doesn't match due to stale context. Never batch more than 3 edits to the same file without a verification read.

10. NO SEMANTIC SEARCH: You have grep, not an AST. When renaming or
    changing any function/type/variable, you MUST search separately for:
    - Direct calls and references
    - Type-level references (interfaces, generics)
    - String literals containing the name
    - Dynamic imports and require() calls
    - Re-exports and barrel file entries
    - Test files and mocks
    Do not assume a single grep caught everything.
