# 🚀 Claire Backend - Guide de Setup

## 📋 Prérequis

### 1. Comptes nécessaires

#### ✅ À créer (GRATUIT pour MVP)
- [Supabase](https://supabase.com) - Base de données PostgreSQL
- [OpenAI](https://openai.com) - Pour les embeddings de knowledge base
- [Firebase](https://firebase.google.com) - Déjà configuré ✅

---

## 🔧 Étape 1 : Configuration Supabase (Base de données)

### 1.1 Créer un compte Supabase
1. Allez sur https://supabase.com
2. Cliquez sur "Start your project"
3. Créez un nouveau projet
4. Notez vos identifiants de connexion

### 1.2 Récupérer la connection string
Dans votre projet Supabase :
1. Allez dans **Settings** → **Database**
2. Copiez la connection string PostgreSQL
3. Remplacez `[PASSWORD]` par votre mot de passe

### 1.3 Créer les tables nécessaires
Exécutez ce SQL dans Supabase SQL Editor :

```sql
-- Table pour la knowledge base
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    tags TEXT[] DEFAULT '{}',
    is_indexed BOOLEAN DEFAULT FALSE,
    embedding_vector FLOAT[],
    folder_id INTEGER,
    user_id TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les dossiers
CREATE TABLE IF NOT EXISTS knowledge_folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER,
    user_id TEXT,
    document_count INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les outils
CREATE TABLE IF NOT EXISTS tools (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50),
    is_enabled BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_folder ON knowledge_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON knowledge_folders(user_id);
```

---

## 🔧 Étape 2 : Configuration OpenAI

### 2.1 Créer une clé API OpenAI
1. Allez sur https://platform.openai.com
2. Créez un compte ou connectez-vous
3. Allez dans **API Keys**
4. Créez une nouvelle clé
5. **IMPORTANT** : Copiez-la immédiatement (vous ne pourrez pas la revoir)

### 2.2 Ajouter des crédits
- Ajoutez au minimum $5 de crédit pour commencer
- Les embeddings coûtent ~$0.0001 par document

---

## 🔧 Étape 3 : Configuration de l'environnement

### 3.1 Créer le fichier .env
```bash
cd pickleglass_web/backend_node
cp config.env.example .env
```

### 3.2 Remplir les variables
Ouvrez `.env` et remplacez :
- `DATABASE_URL` : Votre string Supabase
- `OPENAI_API_KEY` : Votre clé OpenAI
- Les autres variables Firebase (déjà configurées)

---

## 🔧 Étape 4 : Installer les dépendances

```bash
cd pickleglass_web
npm install
```

### Dépendances ajoutées pour le backend
```bash
npm install pg express-rate-limit helmet
```

---

## 🚀 Étape 5 : Lancer le backend

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

### Vérifier que ça marche
Ouvrez http://localhost:5001 dans votre navigateur
Vous devriez voir : `{"message":"pickleglass API is running"}`

---

## 📊 Étape 6 : Tester les endpoints

### Tester Tools API
```bash
curl http://localhost:5001/api/v1/tools
```

### Tester Knowledge Base API
```bash
curl http://localhost:5001/api/v1/knowledge
```

---

## 💰 Estimation des coûts MVP

| Service | Plan | Coût mensuel |
|---------|------|--------------|
| Supabase | Free tier | 0€ |
| OpenAI | Pay-as-you-go | ~5-15€ |
| Vercel (hosting) | Free tier | 0€ |
| **Total MVP** | | **~10-20€/mois** |

---

## 🚨 Troubleshooting

### Backend ne démarre pas
```bash
# Vérifier que le port 5001 n'est pas utilisé
netstat -ano | findstr :5001

# Vérifier les logs
npm run dev
```

### Erreur de connexion à la DB
1. Vérifiez que `DATABASE_URL` est correct
2. Vérifiez que votre IP est autorisée dans Supabase
3. Testez la connexion dans Supabase SQL Editor

### Erreur OpenAI API
1. Vérifiez que `OPENAI_API_KEY` est valide
2. Vérifiez que vous avez des crédits
3. Testez ici : https://platform.openai.com/api-keys

---

## 📝 Prochaines étapes

Une fois le backend fonctionnel :
1. ✅ Ajouter l'authentification aux endpoints
2. ✅ Implémenter les services (toolService, knowledgeService)
3. ✅ Ajouter le rate limiting
4. ✅ Déployer sur Vercel/serverless

---

## 🆘 Besoin d'aide ?

Consultez la documentation :
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Express.js](https://expressjs.com/)
