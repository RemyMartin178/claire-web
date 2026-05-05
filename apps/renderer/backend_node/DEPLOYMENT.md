# 🚀 Guide de Déploiement du Backend Claire

Ce guide vous montre comment déployer le backend Claire en production.

## 📋 Prérequis

1. **Compte Supabase** (gratuit) : https://supabase.com
2. **Compte Railway / Render** (gratuit) : https://railway.app ou https://render.com
3. Node.js 18+ installé en local

---

## 🗄️ Étape 1 : Configurer Supabase

### 1.1 Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez votre **Project ID** et **Database Password**

### 1.2 Exécuter le schéma SQL

1. Dans Supabase, allez dans **SQL Editor**
2. Ouvrez le fichier `database/schema.sql`
3. Copiez tout le contenu et exécutez-le dans l'éditeur SQL

### 1.3 Récupérer les informations de connexion

Dans Supabase → **Project Settings** → **Database** :

- **Connection string** : `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- **Pool connection** (recommandé) : `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`

---

## 🚂 Étape 2 : Déployer sur Railway (Recommandé)

### 2.1 Créer un projet Railway

1. Allez sur [railway.app](https://railway.app)
2. Créez un compte (gratuit avec GitHub)
3. Cliquez sur **New Project** → **Deploy from GitHub repo**
4. Sélectionnez votre repository `claire-web`

### 2.2 Configurer le projet

1. Railway détecte automatiquement le repo
2. Dans les **Settings** du service :
   - **Root Directory** : `pickleglass_web/backend_node`
   - **Start Command** : `npm start`

### 2.3 Configurer les variables d'environnement

Dans Railway → **Variables**, ajoutez :

```env
NODE_ENV=production
PORT=3001

# Supabase Database
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# CORS
PICKLEGLASS_WEB_URL=https://app.clairia.app
APP_WEB_URL=https://app.clairia.app

# OpenAI (pour les embeddings)
OPENAI_API_KEY=sk-...
```

### 2.4 Déployer

Railway va automatiquement :
1. Détecter le `package.json`
2. Installer les dépendances (`npm install`)
3. Lancer le serveur (`npm start`)

### 2.5 Récupérer l'URL du backend

Une fois déployé, Railway génère une URL comme :
`https://votre-projet.up.railway.app`

Notez cette URL !

---

## 🎨 Étape 3 : Déployer sur Render (Alternative)

### 3.1 Créer un service Render

1. Allez sur [render.com](https://render.com)
2. Créez un compte (gratuit)
3. Cliquez sur **New** → **Web Service**
4. Connectez votre repo GitHub

### 3.2 Configuration

- **Name** : `claire-backend`
- **Region** : `Frankfurt (eu-central)` (proche de la France)
- **Branch** : `main`
- **Root Directory** : `pickleglass_web/backend_node`
- **Build Command** : `npm install`
- **Start Command** : `npm start`

### 3.3 Variables d'environnement

Ajoutez les mêmes variables que pour Railway.

### 3.4 Déploiement

Render va automatiquement déployer votre backend.

---

## 🔗 Étape 4 : Connecter le Frontend au Backend

### 4.1 Mettre à jour la configuration

Une fois votre backend déployé, mettez à jour le fichier :

`pickleglass_web/utils/backend-url.ts`

Changez :
```typescript
// Remplacer la détection de production
const BACKEND_URL = 'https://votre-backend.railway.app'; // ou .render.com
```

### 4.2 Redéployer le frontend

Pushez les modifications et le frontend sera mis à jour automatiquement.

---

## ✅ Vérifier le Déploiement

Testez votre API backend :

```bash
# Health check
curl https://votre-backend.railway.app/health

# Test des outils
curl https://votre-backend.railway.app/api/v1/tools
```

---

## 💰 Coûts

| Service | Plan Gratuit | Limites |
|---------|--------------|---------|
| **Supabase** | ✅ Gratuit | 500 MB base, 2GB bandwidth/mois |
| **Railway** | ✅ Gratuit | $5 crédit/mois, 512MB RAM |
| **Render** | ✅ Gratuit | 750 heures/mois |

Pour **100-500 utilisateurs** : Le plan gratuit suffit ! 🎉

---

## 🐛 Dépannage

### Le backend ne démarre pas

1. Vérifiez les logs dans Railway/Render
2. Vérifiez que `PORT` est bien défini (Railway l'injecte automatiquement)
3. Vérifiez la connexion Supabase

### Erreurs de connexion Supabase

1. Utilisez la **connection pool** plutôt que la connexion directe
2. Vérifiez que le mot de passe ne contient pas de caractères spéciaux non échappés
3. Testez la connexion avec un client PostgreSQL

### CORS bloqué

1. Ajoutez votre URL frontend dans les variables d'environnement
2. Vérifiez que l'URL est dans `allowedOrigins`

---

## 🎉 C'est tout !

Votre backend est maintenant déployé en production ! 🚀
