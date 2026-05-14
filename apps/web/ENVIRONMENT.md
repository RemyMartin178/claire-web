# Configuration des Variables d'Environnement - MVP

## 🚀 Configuration Recommandée pour MVP

### Variables Vercel à configurer :

```bash
# URL de l'API (même domaine que l'app web pour le MVP)
NEXT_PUBLIC_API_BASE_URL=https://app.clairia.app

# URL de l'application web
NEXT_PUBLIC_WEB_URL=https://app.clairia.app
```

## 📋 Architecture MVP

### ✅ Approche Simple (Recommandée)
- **Un seul projet Vercel** : `claire-web`
- **Un seul domaine** : `app.clairia.app`
- **API Routes Next.js** : `/api/auth/*`
- **Base de données** : SQLite partagée

### 🔄 Flux d'Authentification MVP

1. **Desktop App** → Crée session via `/api/auth/pending-session`
2. **Web App** → Ouvre `https://app.clairia.app/auth/login?flow=mobile`
3. **Utilisateur** → Se connecte avec Firebase
4. **Web App** → Associe tokens via `/api/auth/associate`
5. **Desktop App** → Récupère tokens via `/api/auth/exchange`

## 🛠️ Déploiement

### Variables d'environnement Vercel :
```bash
NEXT_PUBLIC_API_BASE_URL=https://app.clairia.app
NEXT_PUBLIC_WEB_URL=https://app.clairia.app
NODE_ENV=production
```

### Routes API créées :
- `POST /api/auth/pending-session` - Créer une session en attente
- `POST /api/auth/associate` - Associer les tokens Firebase
- `POST /api/auth/exchange` - Échanger les tokens

## 🔧 Développement Local

### Variables d'environnement locales :
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NODE_ENV=development
```

## 📝 Notes MVP

- **Simplicité** : Un seul projet Vercel
- **Rapidité** : Déploiement automatique
- **Fiabilité** : Moins de points de défaillance
- **Coût** : Un seul déploiement Vercel

## 🔄 Migration Future

Si nécessaire, on peut migrer vers une architecture séparée :
- Projet API séparé sur `api.clairia.app`
- Base de données cloud (PostgreSQL, etc.)
- Microservices
