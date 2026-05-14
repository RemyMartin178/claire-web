# Claire — Handoff brief

> Brief complet pour reprendre le travail sur l'app Electron Claire (assistant
> IA de réunion). Inclut le contexte projet, ce qui a été refactoré en
> s'inspirant de Cluely, l'état des migrations en cours et les chantiers à
> finir.

## 1. Identité projet

- **App** : Claire, assistant IA desktop (Electron) — barre flottante
  toujours visible + dashboard Next.js, écoute du micro/écran via AssemblyAI,
  réponses LLM via OpenAI.
- **Repo** : `github.com/RemyMartin178/claire-web` (branche `main`).
- **Working dir** : `C:\Users\somen\Desktop\glass-main`.
- **Plateforme cible** : Windows 11 (dev sous PowerShell), distribué via
  electron-builder (`electron-builder.yml`).
- **Process Electron** :
  - **Main** (`src/index.js`) : logique métier, IPC, accès OS, fenêtres.
  - **UI overlay** (`src/ui/react/*.jsx`, compilé dans `public/build/content.js`
    via `npm run build:ui`) : barre flottante + panels listen / ask / settings.
  - **Dashboard** (`apps/renderer/`, Next.js 15 App Router, hébergé sur
    `renderer.clairia.app` via Vercel) : page activité, détails session,
    settings modal, etc. En dev, sert sur `http://localhost:3000`.

## 2. Contexte Cluely

On a reverse-engineered Cluely (concurrent direct) en extrayant son `app.asar` :

- **`C:\Users\somen\Desktop\cluely-extract-new\dist-electron\main.js`** —
  576 KB minifié, le main process complet de leur build v2.0.185. Les noms
  de variables sont mono-lettre mais la logique est lisible.
- **`C:\Users\somen\Desktop\cluely-fresh-extract\`** — bundle renderer
  Next.js pour comprendre leurs composants UI (tab selector, settings,
  session details).

Patterns clés repris de leur main.js :

1. **SharedState centralisé** (`shared-state.json` dans `userData`). Un seul
   objet d'état persisté, observable, qui pilote toutes les fenêtres. Une
   fonction `patchSharedState({...})` mute + broadcast à tous les renderers.
2. **Token exchange AssemblyAI** : Electron ne contient pas la master key.
   Le main process fetche un token court (`GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=N`)
   depuis leur API server, puis le client se connecte directement au
   WebSocket AssemblyAI avec ce token. Zéro hop pour le stream audio,
   zéro fuite de clé via l'asar.
3. **5 IPC handlers seulement** : `get-shared-state`, `patch-shared-state`,
   `consume-last-deep-link-auth-token`, `check-for-updates`,
   `capture-screenshot`. Tout le reste (settings, navigation, UI) passe par
   SharedState. Claire est encore à 165 handlers — gros écart.
4. **Window visibility = state.show* + reconciliation** : le manager de
   chaque type de fenêtre (control, chat, dashboard) lit le state et
   appelle `win.show()`/`win.hide()` quand le diff détecte un changement.
   Pas d'appel impératif depuis les flows métier.
5. **`open-dashboard-session`** : quand une session se termine, un IPC
   navigate le webContents du dashboard vers `/dashboard/sessions/$id`
   AVANT de patcher `showDashboard: true`. Résultat : la fenêtre n'apparaît
   que sur la bonne page, pas de flash.
6. **Floating bar = "control + chat" en overlay** : control window
   `163×50px` toujours visible, chat window `540×140-500px` adaptive,
   dashboard `1050×700` séparé. `setContentProtection(isInvisible || isCapturingScreenshot)`
   pour le stealth mode.

## 3. Architecture Claire actuelle (post-migration)

### Auth / API
- **Auth** : Firebase Auth (project `dedale-database`), persistence via
  `electron-store`. Custom token côté Electron, ID token côté requêtes API.
  Service : `src/common/services/authService.js`.
- **AI/STT routing** : 100% via `renderer.clairia.app` (Vercel). Voir
  `src/common/ai/providers/claire-api.js`.
  - `POST renderer.clairia.app/api/ai/complete` : proxy LLM vers OpenAI,
    auth Firebase JWT, rate limit 30/min/user.
  - `GET  renderer.clairia.app/api/token/assemblyai` : retourne un token
    AssemblyAI v3 streaming (`https://streaming.assemblyai.com/v3/token`),
    auth Firebase JWT, rate limit 60/min/user.
  - Les deux routes : `apps/renderer/app/api/ai/complete/route.ts` et
    `apps/renderer/app/api/token/assemblyai/route.ts`.
  - Helper auth : `apps/renderer/app/api/_lib/auth.ts`
    (`verifyFirebaseToken` + `checkRateLimit` in-memory).
- **Backend Railway** : `claire-web-production.up.railway.app` (Express,
  hors scope ici, géré séparément).

### Fenêtres (mode overlay actif sur Windows)
- **Overlay window** : BrowserWindow plein écran transparente
  (`src/window/windowManager.js:223 createOverlayWindow`). Hosts tous les
  panels via React (`src/ui/react/OverlayRoot.jsx`).
- **Panels virtuels** dans le pool : `'listen'`, `'ask'`, `'settings'`,
  `'agent-selector'`, `'shortcut-settings'` — wrappés dans la classe
  `OverlayPanel` (windowManager.js:175). Chaque `panel.show()`/`hide()`
  envoie un IPC `overlay:panel-visibility` au renderer overlay, qui
  toggle `panels[name]` via OverlayRoot.
- **Header** : cas spécial. N'est PAS dans panelNames, mais OverlayRoot
  rend `<MainHeader />` quand `panels.header === true`. Le hide passe par
  une early-return dans `handleWindowVisibilityRequest` qui envoie
  directement `overlay:panel-visibility {name:'header', visible:false}`
  à overlayWindow.webContents. (Voir commit `600322c`.)
- **Dashboard window** : BrowserWindow normale (1050×700), charge
  `http://localhost:3000/electron-login` en dev /
  `https://renderer.clairia.app/electron-login` en prod. Gérée
  impérativement (`dashWin.show/hide/focus`) depuis la subscription
  SharedState dans featureBridge.

### SharedState (Phase 2 livrée)
- **Service** : `src/common/services/sharedStateService.js`. Singleton
  EventEmitter + persistence atomique tmp+rename dans `userData/shared-state.json`.
- **Schéma** : `appVersion`, `signInStatus`, `is{Header,Listen,Dashboard}Loaded`,
  `show{Dashboard,Header,Listen}`, `dashboardFocusCount`, `session`
  (`{id, startedAt}` ou null), `lastSessionId`, `isListenRunning`,
  `isCapturingScreenshot`, `showSessionDisconnectedModal`.
- **TRANSIENT_KEYS** : visibilité fenêtres, session, signInStatus, `*Loaded`,
  `dashboardFocusCount`, `isCapturingScreenshot`, `showSessionDisconnectedModal`.
  Reset aux defaults à chaque cold start, jamais persistées. Du coup en
  pratique seul `lastSessionId` est durable.
- **IPC** : `shared-state:get` (renvoie snapshot), `shared-state:patch`
  (merge partiel, idempotent), `shared-state:updated` (event broadcast à
  toutes les BrowserWindow). Définis dans
  `src/bridge/featureBridge.js:67-110`.
- **Renderer** : `apps/renderer/contexts/SharedStateContext.tsx` expose
  `useSharedState()` qui retourne `{ state, patch, ready }`. Provider
  monté dans `apps/renderer/components/ConditionalLayout.tsx` autour de
  `<ElectronClientLayout>`.
- **Driver** : la subscription `sharedStateService.on('change', ...)`
  dans featureBridge.js traduit chaque mutation en effet sur les
  fenêtres :
  - `showHeader` change → `internalBridge.emit('window:requestVisibility', {name:'header', visible})`.
  - `showListen` change → idem pour 'listen'.
  - `showDashboard` change → `dashWin.show()/hide()` + `focus()`.
  - `dashboardFocusCount` change → `dashWin.focus()`.

### Provider AI/STT côté Electron
- **`src/common/ai/providers/claire-api.js`** : seule provider
  effective. Lazy-require `authService` pour récupérer l'ID token
  Firebase, l'envoie en `Authorization: Bearer <id-token>` à toutes les
  requêtes vers `renderer.clairia.app`.
- **Factory** (`src/common/ai/factory.js`) : `claire-api` en provider
  principal, `openai`/`anthropic`/`assemblyai` gardés en "BYOK"
  fallback. Gemini, Deepgram, Ollama, Whisper supprimés du factory.
- **modelStateService** (`src/common/services/modelStateService.js`) :
  `claire-api` retourne `'server-managed'` comme apiKey, toujours
  sélectionné en priorité au démarrage.

## 4. Inventaire des refactors livrés (commits sur main)

Du plus ancien au plus récent :

| Commit | Sujet |
|--------|-------|
| `59837e6` | refactor: server-side API keys + Cluely-style UI cleanup |
| `fd90acd` | feat(session): auto-navigate to session details on Stop |
| `585fbee` | fix(claire-api): correct authService require path |
| `36cff14` | fix(settings): use DOM Event type for mousedown listener |
| `75dec1d` | fix(token): use correct AssemblyAI v3 streaming token endpoint |
| `19dd386` | feat(session): instant dashboard transition + hide header on Stop |
| `c4ef8cf` | fix: header hide on Stop, button state cycle, instant skeleton transitions |
| `d93dc02` | fix(onboarding): suppress flash for already-signed-in users |
| `71e5082` | feat(state): introduce SharedState (Phase 2 — central store) |
| `2bd74ad` | refactor(state): make SharedState the single driver of window visibility |
| `6ba1f3c` | chore: scrub Cluely mentions from comments |
| `7a1219f` | refactor: rename Cluely* components and CSS classes to Claire* |
| `600322c` | fix: header hide in overlay mode + dashboard skeleton + cleaner startup log |

### Highlights

- **Clés API plus dans l'asar** : `OPENAI_API_KEY` et
  `ASSEMBLYAI_API_KEY` sont uniquement sur Vercel + dans le `.env` local
  pour le dev. Ne sont JAMAIS shippées dans le package.
- **Token exchange AssemblyAI** : flow complet client→server→client
  avec ID token Firebase, fonctionnel.
- **Dashboard navigation instant** : à la fin d'une session, le dashboard
  reçoit `dashboard:navigateToSession` AVANT son `dashWin.show()`. La
  page Next.js a `loading.tsx` (skeleton route) qui s'affiche
  instantanément, plus de flash d'`/activity`.
- **Skeleton loaders** : `apps/renderer/components/ui/skeleton.tsx`
  (primitive) + `loading.tsx` pour `/activity` et `/activity/details` +
  réutilisé en interne dans `details/page.tsx`. Le electron-login
  early-return un skeleton dashboard-shaped pendant la rehydration auth.
- **Header overlay-mode hide** : early-return dans
  `handleWindowVisibilityRequest` + `panels.header` initialisé à `true`
  + `<MainHeader />` rendu conditionnel.
- **CustomSelect Cluely-style** : sans bordure bleue (le pattern
  shadcn-like était `ring-2 ring-[#007AFF]`), avec checkmark sur item
  actif. Voir `apps/renderer/components/SettingsModalElectron.tsx:77`.
- **Nettoyage Cluely** : tous les commentaires `// Cluely-style` etc.
  retirés. Composants `Cluely*` renommés `Claire*` (3 fichiers + classes
  CSS `.cluely-*` → `.claire-*` dans `globals.css`).

## 5. Migration en cours — état précis

**Phase 1 (livrée)** : claire-api unique provider, server-side keys,
fenêtre/session flow instant.

**Phase 2 (livrée)** : SharedState foundation + visibility driver. La
subscription `sharedStateService.on('change', ...)` dans
`featureBridge.js:74-110` est l'unique driver de
`showHeader`/`showListen`/`showDashboard`/`dashboardFocusCount`.

**Phase 2.5 (à venir, ~10 handlers)** : migrer le reste des state
handlers de featureBridge vers des `sharedStateService.patch()`. Voir
section 6.

**Phase 3 (non commencée)** : Recall AI SDK, PostHog, RevenueCat,
sub-process audio refactor.

## 6. Ce qui reste à faire

### A. Migration IPC restante (Bucket A — handlers d'état)

Les handlers suivants sont des candidats à migrer vers SharedState (ajouter
le champ dans le state, patch côté featureBridge, subscriber qui
applique l'effet) :

| Handler | Champ SharedState à ajouter |
|---------|-------------------------------|
| `dashboard:setContentProtection` | `contentProtectionEnabled: bool` |
| `dashboard:setTheme` | `theme: 'light'\|'dark'\|'system'` |
| `dashboard:setOnboardingMode` | `isOnboarding: bool` |
| `dashboard:setTitleBarOverlayVisible` | `titleBarVisible: bool` |
| `model:set-selected-model` | `selectedModel: { llm, stt }` |
| `ask:setPersonality` | `activePersonality: string` |
| `ask:toggleAdaptivePersonality` | `adaptivePersonality: bool` |
| `listen:set-agent-mode` | `agentMode: bool` |
| `update-google-search-setting` | `googleSearchEnabled: bool` |
| `settings:set-auto-update` | `autoUpdate: bool` |

Pour chacun :
1. Ajouter le champ dans `DEFAULT_STATE` (sharedStateService.js).
2. Décider si c'est `TRANSIENT` ou persisté.
3. Dans le handler `ipcMain.handle(...)`, remplacer la logique par
   `sharedStateService.patch({ champ: value })`.
4. Dans la subscription `'change'` de featureBridge, traduire le champ
   en effet (e.g. `setContentProtection` → `dashWin.setContentProtection(...)`).
5. Côté renderer : remplacer l'appel `window.api.dashboard.setX(v)` par
   `useSharedState().patch({ champ: v })`.

**Ce qui ne doit PAS migrer** (Bucket B — actions async) : `ask:sendQuestion*`,
`settings:validate-and-save-key`, `firebase-auth-success`,
`memory:store-*`, `whisper:download-model`, etc. Ce sont des opérations
async avec side effects, pas de l'état partagé.

### B. Recall AI SDK (différenciateur clé Cluely)

Cluely utilise `@recallai/desktop-sdk` pour rejoindre automatiquement
Zoom/Meet et transcrire sans intervention user. Énorme valeur métier.

- Évaluer le pricing (~$0.10/min de meeting).
- Intégrer le SDK : `npm i @recallai/desktop-sdk`.
- Brancher l'event `recording-ended` qui patch
  `{ session: null, showDashboard: true, showSessionDisconnectedModal: true, lastSessionId, dashboardFocusCount: prev+1 }`
  (le pattern Cluely qu'on a déjà).
- UI : un toggle "détection auto réunion" dans les settings.

### C. Bug button state machine (MainHeader.jsx)

`MainHeader.jsx` cycle son `listenSessionStatus` à chaque
`listen:changeSessionResult` reçu. Pattern fragile : un emit en trop
dérègle l'UI. On a déjà eu le bug. Refactor :

- Côté main : envoyer un état EXPLICITE avec chaque result, pas un
  trigger pour cycle :
  ```js
  header.webContents.send('listen:state', { state: 'inSession' });
  // ou: { state: 'idle' | 'recording' | 'finishing' }
  ```
- Côté MainHeader : `setListenSessionStatus(payload.state)` au lieu du
  cycle.
- Idéalement : remplacer par `useSharedState()` qui lit
  `state.isListenRunning` directement, plus besoin de l'IPC dédié.

Voir `src/ui/react/MainHeader.jsx:647-661` pour le cycle actuel.

### D. Centraliser le reconciler

Actuellement la subscription `'change'` qui pilote les fenêtres vit
dans `featureBridge.js`. C'est mal placé — featureBridge est censé
juste enregistrer les handlers IPC, pas contenir de logique de
fenêtrage.

Solution propre : créer `src/window/windowReconciler.js` qui :
1. S'abonne à sharedStateService.
2. Connaît le windowManager (import direct).
3. Traduit les state changes en `internalBridge.emit` ou
   `dashWin.show()/hide()`.
4. S'init dans `index.js` après `sharedStateService.init()` et
   `windowManager.createWindows()`.

### E. Onglet Calendrier dans Settings

Plan déjà rédigé dans
`C:\Users\somen\.claude\plans\ok-j-ai-re-design-peppy-wilkinson.md` — non
exécuté. Backend Google Calendar OAuth :
- 3 routes Vercel à créer (`/api/calendar/connect`, `/callback`,
  `/status`).
- UI dans `SettingsModalElectron.tsx` onglet "Calendrier".

### F. Onglet Profil + Sécurité

Mêmes spécs que dans le plan ci-dessus :
- Profil : inline edit du `displayName` via `updateUserProfile()`.
- Sécurité : `PasswordModal` via `usePasswordModal()`, devices via
  `/api/v1/sessions/user/{uid}`, `deleteAccount()` via `utils/api.ts`.

### G. Analytics & monétisation

- **PostHog** : tracking d'événements pour comprendre le funnel. Cluely
  l'a en dur dans son main.js.
- **RevenueCat** : gestion abonnement in-app native (trial, upgrade,
  churn). Actuellement Claire a Stripe côté web uniquement. Offerings
  in-app = plus de conversions.

### H. Tests

Aucun test automatisé sur le main process ni les routes Vercel. À
mettre en place :
- Vitest pour les routes (mock Firebase Admin, AssemblyAI, OpenAI).
- Test du parcours start/stop (mock IPC + assertions sur les patches
  shared-state).

## 7. Annexes

### Variables d'env attendues

**`.env` racine (dev local)** — chargé par `src/index.js` via `dotenv` :
```
OPENAI_API_KEY=sk-proj-...
ASSEMBLYAI_API_KEY=b744bdea...
DASHBOARD_DEV_URL=http://localhost:3000/electron-login   # dev only
```

Note : `DASHBOARD_DEV_URL` est strippée du `.env` en prod par
`copy-env-prod.js` (afterPack hook electron-builder).

**`apps/renderer/.env.local`** (dev Next.js) :
```
OPENAI_API_KEY=sk-proj-...
ASSEMBLYAI_API_KEY=b744bdea...
GEMINI_API_KEY=AIzaSyAb...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=...
```

**Vercel Production env vars** (Settings → Environment Variables) :
```
OPENAI_API_KEY
ASSEMBLYAI_API_KEY
FIREBASE_PROJECT_ID=dedale-database
FIREBASE_CLIENT_EMAIL=...@dedale-database.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDZz5...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.clairia.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dedale-database
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=100635676468
NEXT_PUBLIC_FIREBASE_APP_ID=1:100635676468:web:46fdecfad...
```

### Commandes courantes

```powershell
# Dev — main process + UI overlay
npm run build:ui              # rebuild src/ui/react → public/build/content.js
npx electron .                # lance le main (relit src/* automatiquement)

# Dev — Next.js renderer (à lancer dans un terminal séparé)
cd apps/renderer
npm run dev                   # serve sur localhost:3000

# Build prod
npm run build:win             # package l'app Windows complète

# Release
npm run release               # bump version + tag + push
npm run release:nobump        # re-release sans bump (overwrite tag)
```

### IPC channels critiques

| Channel | Direction | Sens |
|---------|-----------|------|
| `shared-state:get` | renderer→main | snapshot du state |
| `shared-state:patch` | renderer→main | mutate partial |
| `shared-state:updated` | main→renderer | broadcast après chaque change |
| `dashboard:startClaire` | renderer→main | démarre une session listen |
| `listen:changeSession` | renderer→main | "Listen"/"Stop"/"Done" |
| `dashboard:navigateToSession` | main→renderer | nav vers /activity/details |
| `overlay:panel-visibility` | main→renderer overlay | show/hide d'un panel React |
| `window:requestVisibility` | internalBridge (in-process) | request show/hide |

### Fichiers les plus touchés

```
src/
├── index.js                               # main entrypoint, app.whenReady
├── bridge/
│   ├── featureBridge.js                   # 165 IPC handlers + SharedState driver
│   └── internalBridge.js                  # EventEmitter intra-main
├── common/
│   ├── ai/
│   │   ├── factory.js                     # provider registry (claire-api en tête)
│   │   └── providers/
│   │       ├── claire-api.js              # ⭐ provider unique server-side
│   │       ├── openai.js / anthropic.js   # BYOK fallback
│   │       └── assemblyai.js              # BYOK STT, deprecated
│   └── services/
│       ├── authService.js                 # Firebase + custom token + ID token
│       ├── modelStateService.js           # selection model + claire-api priority
│       └── sharedStateService.js          # ⭐ SharedState singleton
├── features/listen/
│   ├── listenService.js                   # session pipeline + STT init
│   └── stt/sttService.js                  # multi-provider STT abstraction
├── window/
│   └── windowManager.js                   # 79KB — overlay + panels + reconciliation
└── ui/react/
    ├── OverlayRoot.jsx                    # ⭐ host du floating bar + panels
    ├── MainHeader.jsx                     # barre flottante (cycle status fragile)
    ├── ListenView.jsx / AskView.jsx       # panels overlay
    └── SettingsView.jsx                   # legacy settings (peu utilisé)

apps/renderer/                             # Next.js dashboard
├── app/
│   ├── api/
│   │   ├── _lib/auth.ts                   # verifyFirebaseToken + rate limit
│   │   ├── ai/complete/route.ts           # ⭐ proxy LLM
│   │   └── token/assemblyai/route.ts      # ⭐ AssemblyAI v3 token
│   ├── activity/
│   │   ├── page.tsx                       # liste sessions
│   │   ├── loading.tsx                    # skeleton route
│   │   └── details/
│   │       ├── page.tsx                   # détail session
│   │       └── loading.tsx                # skeleton route
│   └── electron-login/page.tsx            # auth + skeleton dashboard
├── components/
│   ├── ConditionalLayout.tsx              # SharedStateProvider wrap
│   ├── ElectronClientLayout.tsx           # navigateToSession listener
│   ├── SettingsModalElectron.tsx          # CustomSelect, settings UI
│   └── ui/skeleton.tsx                    # primitive Skeleton
├── contexts/
│   ├── AuthContext.tsx                    # Firebase Auth state
│   └── SharedStateContext.tsx             # ⭐ React context SharedState
└── utils/
    ├── api.ts                             # client API helpers
    └── firebaseAdmin.ts                   # Firebase Admin SDK (server-side)
```

### Risque / pièges connus

1. **`createFeatureWindow` (singulier)** est une closure locale dans
   `createWindows()` — pas accessible depuis les exports. Utiliser
   `createFeatureWindows` (pluriel, module-level) qui prend
   `(header, [names])`.
2. **Mode overlay vs mode window** : un même nom de fenêtre peut
   pointer vers une `BrowserWindow` ou un `OverlayPanel`. Tester
   `instanceof OverlayPanel` ou `overlayMode === true` avant d'appeler
   des méthodes BrowserWindow-spécifiques.
3. **`listen:changeSessionResult` cycle d'état** : envoyer plus d'un
   "result" par cycle utilisateur dérègle MainHeader. Si tu rajoutes
   un appel à `handleListenRequest('Done')` côté main pour cleanup,
   passe par `internalBridge.emit('window:requestVisibility', ...)`
   directement, jamais par `handleListenRequest`.
4. **`shared-state.json`** est dans `app.getPath('userData')` — sur
   Windows : `%APPDATA%\Claire\shared-state.json`. Persistence atomique
   tmp+rename. Reset complet des TRANSIENT_KEYS au load.
5. **Build `:ui`** obligatoire après tout edit dans `src/ui/react/*` —
   sinon `public/build/content.js` reste l'ancien bundle.
6. **Vercel deploy** : push GitHub déclenche un redeploy auto. Sans
   redeploy, les routes API restent l'ancienne version. Tester avec
   `curl https://renderer.clairia.app/api/token/assemblyai` (doit
   retourner 401 Unauthorized si la route est live).
7. **Header window orphelin** : en overlay mode, une `BrowserWindow`
   header peut survivre dans le pool sans être affichée. Le pill
   visible est dans OverlayRoot. Hide doit passer par le path
   `overlay:panel-visibility` (cf. fix commit `600322c`).

### Memory / persistence interne (Claude memory dir)

Pas pertinent pour Codex, mais pour info : un répertoire de notes
existe à `C:\Users\somen\.claude\projects\C--Users-somen-Desktop-glass-main\memory\`
avec des préférences user (no auto-build, no auto-push initial puis
auto-push autorisé, sidebar scope).

## 8. Mission Codex — où prendre le relais

Suggestion d'ordre d'attaque (du moins risqué au plus structurant) :

1. **Vérifier que le dernier commit `600322c` règle bien les bugs**
   sur la machine de l'utilisateur (rebuild `:ui` puis tester
   Démarrer Claire en overlay mode). Si ça ne marche toujours pas,
   logs détaillés requis.
2. **Bug button state machine** (section 6.C). Petit refactor isolé,
   gros gain de fiabilité.
3. **Migration Phase 2.5** (section 6.A). 10 handlers à migrer,
   pattern répétitif — facile à paralléliser.
4. **Centraliser le reconciler** (section 6.D). Move depuis
   featureBridge vers `windowReconciler.js`.
5. **Recall AI SDK** (section 6.B) — gros chantier, mais
   différenciateur produit majeur.
6. **PostHog + RevenueCat** (section 6.G).
7. **Tests** (section 6.H).

Pour chaque tâche : créer une branche `feat/...`, ouvrir une PR,
maintenir la convention de commit existante (Conventional Commits +
co-author Claude). Push automatique autorisé après chaque commit.

—

Fin du brief. Bon courage à Codex.
