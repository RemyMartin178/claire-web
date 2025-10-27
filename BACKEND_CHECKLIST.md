# ✅ Backend Setup Checklist - Claire MVP

## 🎯 Ce qui a été fait automatiquement

✅ Création des routes `/api/v1/tools` et `/api/v1/knowledge`
✅ Intégration des routes dans `backend_node/index.js`
✅ Création du fichier de configuration `.env.example`
✅ Documentation complète dans `BACKEND_SETUP.md`

---

## 📋 Ce que VOUS devez faire

### Phase 1 : Setup des services (30 minutes)

#### 1. Créer un compte Supabase (GRATUIT)
- [ ] Aller sur https://supabase.com
- [ ] Créer un nouveau projet
- [ ] Noter les identifiants de connexion
- [ ] Copier la connection string PostgreSQL
- [ ] Créer les tables SQL (voir BACKEND_SETUP.md)

#### 2. Créer un compte OpenAI (PAYANT - ~$5 minimum)
- [ ] Aller sur https://platform.openai.com
- [ ] Créer un compte
- [ ] Ajouter des crédits ($5 minimum pour commencer)
- [ ] Créer une clé API
- [ ] **SAUVEGARDER la clé immédiatement** (ne peut pas être récupérée)

#### 3. Configuration locale
- [ ] Créer le fichier `.env` depuis `config.env.example`
- [ ] Remplir `DATABASE_URL` avec votre Supabase
- [ ] Remplir `OPENAI_API_KEY` avec votre clé OpenAI
- [ ] Vérifier les variables Firebase

---

### Phase 2 : Installation et test (15 minutes)

#### 1. Installer les dépendances
```bash
cd pickleglass_web
npm install
npm install pg express-rate-limit helmet
```

#### 2. Lancer le backend
```bash
# En développement
npm run dev

# Ou en production
npm start
```

#### 3. Tester que ça fonctionne
- [ ] Ouvrir http://localhost:5001
- [ ] Voir `{"message":"pickleglass API is running"}`
- [ ] Tester `/api/v1/tools` (devrait retourner un tableau)
- [ ] Tester `/api/v1/knowledge` (devrait retourner un tableau vide)

---

### Phase 3 : Déploiement et mise en production (optionnel)

#### 1. Pousser sur GitHub [[memory:5234983]]
```bash
cd pickleglass_web
git add .
git commit -m "Add backend routes for tools and knowledge base"
git push origin main
```

#### 2. Vérifier que tout fonctionne en prod
- [ ] Vérifier les logs dans les pages Tools et Knowledge Base
- [ ] Tester l'upload d'un document
- [ ] Vérifier que les erreurs sont gérées proprement

---

## 💰 Coûts estimés

### MVP (100-500 utilisateurs)

| Service | Coût mensuel | Payant |
|---------|--------------|--------|
| **Supabase** | 0€ | Non |
| **OpenAI** | ~10-20€ | Oui |
| **Vercel (hosting)** | 0€ | Non |
| **TOTAL** | **~10-20€/mois** | |

### Évolution future (1000+ utilisateurs)

| Service | Coût mensuel | Quand |
|---------|--------------|-------|
| **Supabase Pro** | 25€/mois | >500MB DB |
| **OpenAI** | 50-100€/mois | Beaucoup d'embeddings |
| **Vercel Pro** | 20€/mois | Site avec trafic |
| **TOTAL** | **~100€/mois** | |

---

## 🚨 En cas de problème

### Le backend ne démarre pas
1. Vérifier que Node.js 20+ est installé
2. Vérifier que le port 5001 n'est pas utilisé
3. Vérifier les logs : `npm run dev`

### Erreur de connexion à la base de données
1. Vérifier que `DATABASE_URL` est correct
2. Vérifier que l'IP est autorisée dans Supabase
3. Tester la connexion dans Supabase SQL Editor

### Erreur OpenAI API
1. Vérifier que `OPENAI_API_KEY` est valide
2. Vérifier que vous avez des crédits
3. Tester sur https://platform.openai.com/api-keys

### Les pages frontend affichent "Backend non disponible"
1. Vérifier que le backend tourne sur le bon port
2. Vérifier que CORS est bien configuré
3. Vérifier la console navigateur pour les erreurs

---

## 📝 Notes importantes

### Pour le MVP
- ✅ PostgreSQL sur Supabase (gratuit jusqu'à 500MB)
- ✅ Backend simplifié sans cache Redis
- ✅ Rate limiting basique
- ✅ Monitoring des logs manuel

### Pour la production (plus tard)
- [ ] Ajouter Redis pour le cache
- [ ] Implémenter des jobs d'embeddings en background
- [ ] Ajouter monitoring (Sentry, DataDog)
- [ ] Mise à l'échelle automatique

---

## 🎉 Prochaines étapes après setup

Une fois tout configuré :

1. **Tester le workflow complet**
   - Créer un dossier dans Knowledge Base
   - Uploader un document
   - Vérifier qu'il apparaît

2. **Implémenter les fonctionnalités manquantes**
   - Authentification sur les endpoints
   - Rate limiting
   - Génération d'embeddings

3. **Déployer en production**
   - Push sur GitHub
   - Deploy sur Vercel
   - Tester en conditions réelles

---

## 📞 Support

Si vous bloquez quelque part :
1. Lire `BACKEND_SETUP.md` en détail
2. Vérifier les logs backend
3. Vérifier la console navigateur
4. Consulter la documentation des services

**Bon courage ! 🚀**
