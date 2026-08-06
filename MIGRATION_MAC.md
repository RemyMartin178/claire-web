# Migration Windows → Mac — Snapshot du 6 août 2026

> Note pour Claude Code : lis ce fichier au premier lancement sur le Mac, puis propose à l'utilisateur de le supprimer une fois la migration validée.

## État au moment de la migration

- Branche active : `fix-memory-api-best-effort` (tout le travail en cours est dessus, poussé sur origin).
- Branches : `main`, `fix-memory-api-best-effort`, `fix-boot-splash-handoff` — toutes synchronisées avec origin au moment du départ.
- Le dernier commit sur cette branche est un **snapshot de migration** : il regroupe du travail en cours hétérogène (onboarding renderer, page admin web, fixes divers) commité en bloc pour ne rien perdre, pas une unité de travail propre.

## Contenu du snapshot

- `apps/renderer/app/onboarding/` — nouveau flow d'onboarding (non terminé/non validé).
- `pickleglass_web/app/admin/` — nouvelle page admin + refonte de `app/api/admin/list-subscriptions/route.ts`.
- Modifs renderer : `layout.tsx`, `ConditionalLayout.tsx`, `SettingsModalElectron.tsx`, `activity/page.tsx`, `activity/details/page.tsx`, `useSessionQueries.ts`, `utils/api.ts`, `utils/oauth.ts`, `utils/sessionDisplay.ts`.
- Main process : `src/index.js`, `src/features/listen/summary/summaryService.js`.
- `firestore.rules`, `pickleglass_web/components/Sidebar.tsx`.

## Resté sur le PC Windows (volontairement non commité)

- Fichiers personnels hors projet : `AI_for_Everyday_Business_Future_Minds.docx`, `build_ebook.py`, `build_marketing_pdf.py`, `build_digital_marketing_mastery.py`, `build_trading_blueprint_content.py`, `tmp/`.

## À faire sur le Mac

1. Copier manuellement les fichiers `.env` (jamais dans git) depuis le PC Windows :
   - `.env`, `.env.local` (racine)
   - `apps/renderer/.env`, `apps/renderer/.env.local`
   - `pickleglass_web/.env`, `pickleglass_web/.env.local`
2. `npm install` à la racine (et dans les sous-projets si nécessaire) — ne jamais réutiliser le `node_modules` de Windows.
3. Premier lancement : accorder les permissions macOS **Enregistrement d'écran** et **Microphone**.
4. Vérifier la config electron-builder pour la cible mac (`.dmg`/`.app`) si packaging.
5. Vérifier que le snapshot (onboarding + admin) fonctionne, puis découper/finir proprement ce travail.
