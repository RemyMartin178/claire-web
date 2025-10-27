# 🚀 Supabase Best Practices pour Claire

## ✅ Pourquoi Supabase est PARFAIT pour votre MVP

### **Avantages Supabase vs Alternatives**

| Critère | Supabase | Neon | PlanetScale | Firebase |
|---------|----------|------|-------------|----------|
| **Gratuit MVP** | ✅ 500MB | ✅ 0.5GB | ✅ 5GB | ❌ Payant |
| **PostgreSQL** | ✅ Vrai Postgres | ✅ Postgres | ❌ MySQL | ❌ NoSQL |
| **Real-time** | ✅ Natif | ✅ Via websockets | ❌ | ✅ Natif |
| **Équipe ≤3** | ✅ Inclus | ✅ Inclus | ✅ Inclus | ❌ |
| **Row Level Security** | ✅ Oui | ✅ Oui | ❌ | ❌ |
| **Calcul vectoriel** | ✅ pgvector | ✅ pgvector | ❌ | ❌ |
| **Facile à migrer** | ✅ Facile | ✅ Très facile | ❌ MySQL | ❌ NoSQL |

### **Pourquoi c'est PARFAIT pour votre cas :**

1. **Gratuit jusqu'à 500 utilisateurs** → Votre MVP
2. **PostgreSQL natif** → Pas de changement de code
3. **pgvector** → Embeddings pour knowledge base
4. **Real-time** → Fonctionnalités live (future)
5. **Row Level Security** → Isolation des données utilisateurs
6. **Facile à scaler** → Upgrade simple si succès

---

## 🔧 Configuration Optimale

### **1. Connection Pooling (CRITIQUE)**

Supabase offre 2 types de connexions :

#### ❌ Évitez (limite 60 connexions)
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

#### ✅ Utilisez (limite 200 connexions)
```env
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Pourquoi ?** Connection pooling partage les connexions entre utilisateurs.

### **2. RLS (Row Level Security)**

Activez RLS pour isoler les données par utilisateur :

```sql
-- Dans Supabase SQL Editor
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_folders ENABLE ROW LEVEL SECURITY;

-- Politique : les users voient seulement leurs données
CREATE POLICY "Users can only see their own documents"
ON knowledge_documents
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only create their own documents"
ON knowledge_documents
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
```

### **3. Indexes pour Performance**

```sql
-- Ajoutez ces index si pas déjà présents
CREATE INDEX IF NOT EXISTS idx_knowledge_user_created 
ON knowledge_documents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_title_search 
ON knowledge_documents USING gin(to_tsvector('french', title));
```

---

## 📊 Limites du Plan Gratuit

| Ressource | Limite |
|-----------|--------|
| **Database** | 500MB |
| **Bandwidth** | 2GB/mois |
| **Connexions** | 60 (direct) ou 200 (pooled) |
| **Equipe** | 3 membres |
| **Projets** | 2 projets |

**Est-ce suffisant pour 100-500 users ?**
- ✅ 500MB = ~100,000 documents texte (estimé)
- ✅ 2GB/mois = ~5000 requêtes/jour (estimé)

**Quand upgrader ?**
- Quand DB > 400MB
- Quand bandwith > 1.5GB/mois
- Plan Pro : $25/mois pour 8GB DB + 50GB bandwidth

---

## 🚀 Optimisations Performance

### **1. Connection Reuse**

Utilisez un pool de connexions :

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Réutiliser le pool partout
module.exports = pool;
```

### **2. Requêtes Optimisées**

```javascript
// ❌ MAUVAIS : N+1 queries
for (const doc of documents) {
  const folder = await db.query('SELECT * FROM folders WHERE id = $1', [doc.folder_id]);
}

// ✅ BON : Single query
const docsWithFolders = await db.query(`
  SELECT d.*, f.name as folder_name
  FROM knowledge_documents d
  LEFT JOIN knowledge_folders f ON d.folder_id = f.id
  WHERE d.user_id = $1
`, [userId]);
```

### **3. Batch Operations**

```javascript
// ❌ MAUVAIS : Multiple inserts
for (const doc of docs) {
  await db.query('INSERT INTO documents...');
}

// ✅ BON : Batch insert
await db.query('INSERT INTO documents VALUES (unnest($1::text[]), ...)', [documents]);
```

---

## 🛡️ Sécurité

### **1. Utilisez RLS (Row Level Security)**

```sql
-- Activer RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Politique de base
CREATE POLICY "Users can only access their own data"
ON knowledge_documents
FOR ALL
USING (user_id = auth.uid()::text);
```

### **2. Paramétrisez vos requêtes**

```javascript
// ❌ DANGEREUX : SQL injection
db.query(`SELECT * FROM docs WHERE user_id = '${userId}'`);

// ✅ SÉCURISÉ : Paramétrisé
db.query('SELECT * FROM docs WHERE user_id = $1', [userId]);
```

---

## 📈 Monitoring

### **Dans Supabase Dashboard**

1. Allez dans **Database** → **Connection Pooling**
2. Vérifiez :
   - Active connections
   - Pool size
   - Query performance

### **Logs importants**

```javascript
// Ajoutez dans votre code
pool.on('connect', () => console.log('✅ DB connected'));
pool.on('error', (err) => console.error('❌ DB error:', err));
```

---

## 🎯 Checklist Supabase pour Claire

- [x] **Connection String** : Utiliser pooler (port 6543)
- [x] **RLS activé** : Sur toutes les tables sensibles
- [x] **Indexes** : Sur user_id, created_at, search fields
- [x] **Connection Pool** : Max 10 connexions simultanées
- [x] **Monitoring** : Vérifier weekly dans dashboard
- [ ] **Backups** : Automatique avec Supabase (gratuit)

---

## 💡 Conseil Final

**Supabase est PARFAIT pour votre MVP Claire car :**
1. Gratuit pour commencer
2. PostgreSQL = standard industrie
3. Scalable facilement ($25/mois si nécessaire)
4. Répond à tous vos besoins (KB, Tools, Users)
5. Bonne documentation

**Ne changez RIEN pour le moment.** Vous pouvez toujours migrer plus tard si nécessaire.

---

## 🔗 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
