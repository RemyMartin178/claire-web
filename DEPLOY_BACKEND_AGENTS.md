# 🚀 Guide : Déployer le Backend Agents sur Railway

## 📋 Situation Actuelle

- **Railway déploie actuellement** : `pickleglass_web/backend_node` (backend simple, **PAS de routes agents**)
- **Backend complet avec agents** : `backend/` (contient `/api/v1/agents` mais **NON déployé**)
- **Problème** : L'app Electron appelle `https://claire-web-production.up.railway.app/api/v1/agents` → **404** car cette route n'existe pas dans `pickleglass_web/backend_node`

## ✅ Solution : Déployer `backend/` sur Railway

---

## ÉTAPE 1 : Créer un Nouveau Service Railway pour le Backend Agents

### 1.1 Aller sur Railway

1. Va sur [railway.app](https://railway.app)
2. Connecte-toi avec ton compte GitHub
3. Ouvre ton projet existant (celui qui contient `claire-web-production`)

### 1.2 Créer un Nouveau Service

1. Dans ton projet Railway, clique sur **"+ New"** → **"GitHub Repo"**
2. Sélectionne ton repo `glass-main` (ou `glass-clean` selon ta mémoire)
3. Railway va créer un nouveau service

### 1.3 Configurer le Service

Dans les **Settings** du nouveau service :

- **Name** : `claire-backend-agents` (ou un nom de ton choix)
- **Root Directory** : `backend`
- **Start Command** : `npm start`
- **Build Command** : `npm install` (automatique normalement)

---

## ÉTAPE 2 : Configurer les Variables d'Environnement

Dans Railway → **Variables** du nouveau service, ajoute :

### 2.1 Variables Obligatoires

```env
# Environnement
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# Base de données Neon/PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
NEON_PROJECT_ID=ton-project-id-neon

# Firebase Admin (pour l'authentification)
FIREBASE_PROJECT_ID=ton-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ton-project.iam.gserviceaccount.com

# CORS (URLs autorisées)
ALLOWED_ORIGINS=https://app.clairia.app,http://localhost:3000
FRONTEND_URL=https://app.clairia.app
WEB_DASHBOARD_URL=https://app.clairia.app

# OpenAI (pour les embeddings et certains agents)
OPENAI_API_KEY=sk-...

# Logs
LOG_LEVEL=info
```

### 2.2 Où Trouver ces Variables ?

#### DATABASE_URL et NEON_PROJECT_ID
- Va sur [neon.tech](https://neon.tech) ou ton provider PostgreSQL
- Dans les paramètres du projet, copie la **Connection String**
- Format : `postgresql://user:password@host:5432/database`

#### Firebase Admin
- Va sur [Firebase Console](https://console.firebase.google.com)
- Sélectionne ton projet
- **Project Settings** → **Service Accounts** → **Generate New Private Key**
- Télécharge le JSON et copie :
  - `private_key` → `FIREBASE_PRIVATE_KEY` (garde les `\n`)
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `project_id` → `FIREBASE_PROJECT_ID`

#### OPENAI_API_KEY
- Tu l'as déjà dans ton `.env` local
- Copie la même clé

---

## ÉTAPE 3 : Mettre à Jour la Configuration Railway

### 3.1 Créer/Mettre à Jour `railway.json` pour le Backend

Crée un fichier `backend/railway.json` :

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3.2 Vérifier `backend/package.json`

Le script `start` doit être présent :
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

✅ C'est déjà le cas dans ton `backend/package.json`

---

## ÉTAPE 4 : Exécuter les Migrations de Base de Données

### 4.1 Vérifier que la Table `agents` Existe

Une fois le backend déployé, tu dois exécuter les migrations SQL pour créer la table `agents`.

#### Option A : Via Railway (Recommandé)

1. Dans Railway, ouvre le service `claire-backend-agents`
2. Va dans **Deployments** → Clique sur le dernier déploiement
3. Ouvre la **Console** (terminal)
4. Exécute :

```bash
# Se connecter à la base de données
psql $DATABASE_URL

# Ou si tu as un script de migration
node scripts/run-migration.js
```

#### Option B : Via SQL Directement

1. Va sur ton provider PostgreSQL (Neon, Supabase, etc.)
2. Ouvre l'**SQL Editor**
3. Exécute les migrations dans l'ordre :

```sql
-- 1. Créer la table agents (si elle n'existe pas)
-- Vérifie backend/database/schema/ pour le schéma complet

-- 2. Migration 004 : Isolation utilisateurs
-- Copie le contenu de backend/database/migrations/004_add_user_agent_isolation.sql
```

### 4.2 Vérifier les Migrations Disponibles

Les migrations sont dans `backend/database/migrations/` :
- `001_add_folders_simple.sql`
- `002_create_memory_evolution_log.sql`
- `003_create_memory_sharing_rules.sql`
- `004_add_user_agent_isolation.sql` ← **Important pour les agents**
- `005_create_user_credentials_table.sql`
- `007_alter_users_add_guest_support.sql`

**Exécute-les dans l'ordre** si la base est vide.

---

## ÉTAPE 5 : Créer des Agents de Test

### 5.1 Via l'API (Une fois le Backend Déployé)

```bash
# Récupérer l'URL du backend Railway
BACKEND_URL=https://claire-backend-agents-production.up.railway.app

# Créer un agent de test
curl -X POST $BACKEND_URL/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TON_TOKEN" \
  -d '{
    "name": "Assistant Claire",
    "description": "Assistant IA principal",
    "personality_type": "assistant",
    "ai_model": "gpt-4",
    "system_prompt": "Tu es Claire, un assistant IA bienveillant et utile.",
    "is_active": true,
    "agent_type": "system"
  }'
```

### 5.2 Via SQL Directement

```sql
INSERT INTO agents (
  name, 
  description, 
  personality_type, 
  ai_model, 
  system_prompt, 
  is_active, 
  agent_type,
  created_at,
  updated_at
) VALUES (
  'Assistant Claire',
  'Assistant IA principal pour les utilisateurs',
  'assistant',
  'gpt-4',
  'Tu es Claire, un assistant IA bienveillant et utile.',
  true,
  'system',
  NOW(),
  NOW()
);
```

---

## ÉTAPE 6 : Mettre à Jour l'App Electron

### 6.1 Récupérer l'URL du Backend Railway

Une fois déployé, Railway génère une URL comme :
`https://claire-backend-agents-production.up.railway.app`

### 6.2 Mettre à Jour `launch-prod-logs.bat`

Modifie `launch-prod-logs.bat` pour pointer vers le nouveau backend :

```batch
REM Set production URLs for Railway
set pickleglass_API_URL=https://claire-backend-agents-production.up.railway.app
set pickleglass_WEB_URL=https://app.clairia.app
```

### 6.3 OU Mettre à Jour `src/index.js`

Si tu veux que ce soit permanent dans le build, modifie `src/index.js` :

```javascript
const defaultProdApiUrl = 'https://claire-backend-agents-production.up.railway.app';
```

---

## ÉTAPE 7 : Tester le Déploiement

### 7.1 Health Check

```bash
curl https://claire-backend-agents-production.up.railway.app/health
```

Devrait retourner :
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": { ... }
}
```

### 7.2 Test de l'API Agents

```bash
curl https://claire-backend-agents-production.up.railway.app/api/v1/agents
```

Devrait retourner un tableau d'agents (vide si tu n'en as pas créé) :
```json
[]
```

### 7.3 Tester depuis l'App Electron

1. Lance `launch-prod-logs.bat`
2. Ouvre l'app
3. Va dans la barre flottante → **Agents IA**
4. Les agents devraient apparaître !

---

## 🔧 Dépannage

### Erreur : "Route not found" (404)

✅ **Vérifie** :
- Le service Railway pointe bien vers `backend/` (pas `pickleglass_web/backend_node`)
- Le `startCommand` est bien `npm start`
- Les logs Railway montrent que le serveur démarre sur le port 5001

### Erreur : "Database connection failed"

✅ **Vérifie** :
- `DATABASE_URL` est correct dans Railway Variables
- La base de données est accessible depuis Railway (pas de firewall)
- `NEON_PROJECT_ID` est défini

### Erreur : "Firebase Auth has not been initialized"

✅ **Vérifie** :
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` sont définis
- Le format de `FIREBASE_PRIVATE_KEY` garde les `\n` (pas de retours à la ligne réels)

### Les Agents n'Apparaissent Pas dans l'App

✅ **Vérifie** :
- L'URL dans `pickleglass_API_URL` pointe vers le bon backend
- La table `agents` existe et contient des agents avec `is_active = true`
- Les logs de l'app montrent des appels à `/api/v1/agents` (pas de 404)

---

## 📝 Checklist Finale

- [ ] Service Railway créé pour `backend/`
- [ ] Variables d'environnement configurées dans Railway
- [ ] Backend déployé et accessible (`/health` fonctionne)
- [ ] Migrations SQL exécutées (table `agents` créée)
- [ ] Au moins un agent créé dans la base de données
- [ ] `pickleglass_API_URL` mis à jour dans `launch-prod-logs.bat` ou `src/index.js`
- [ ] Test depuis l'app Electron : les agents apparaissent dans la barre flottante

---

## 🎯 Résultat Attendu

Une fois tout configuré :
- ✅ L'app Electron se connecte à `https://claire-backend-agents-production.up.railway.app/api/v1/agents`
- ✅ La route retourne un JSON avec les agents
- ✅ Les agents apparaissent dans la catégorie **"Agents IA"** de la barre flottante
- ✅ Tu peux utiliser les agents pour les conversations Ask

---

**Besoin d'aide ?** Vérifie les logs Railway dans l'onglet **Deployments** → **View Logs**

