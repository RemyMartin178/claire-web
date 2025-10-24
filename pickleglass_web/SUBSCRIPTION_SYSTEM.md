# Système d'abonnement Claire

## 🎯 Vue d'ensemble

Le système d'abonnement Claire permet de gérer les abonnements Stripe et de synchroniser le statut entre l'application web et l'application desktop.

## 📋 Plans disponibles

### Claire Gratuit
- **Prix** : 0€/mois
- **Fonctionnalités** : Fonctionnalités de base
- **Limitations** : Accès limité aux fonctionnalités Premium

### Claire Plus
- **Prix** : 20€/mois ou 100€/an
- **Fonctionnalités** : 
  - Agents IA personnalisés
  - Intégrations avec outils externes
  - Base de connaissances personnalisée
  - Support prioritaire

### Claire Enterprise
- **Prix** : Sur devis
- **Fonctionnalités** : Toutes les fonctionnalités Plus + personnalisation complète

## 🔧 Architecture technique

### 1. Stripe Integration

#### Webhooks Stripe (`/app/api/stripe/webhook/route.ts`)
- **Événements gérés** :
  - `checkout.session.completed` : Abonnement créé
  - `customer.subscription.updated` : Abonnement modifié
  - `customer.subscription.deleted` : Abonnement annulé
  - `invoice.payment_succeeded` : Paiement réussi
  - `invoice.payment_failed` : Paiement échoué

#### Checkout Stripe (`/app/api/stripe/checkout/route.ts`)
- Création de sessions de paiement
- Redirection vers page de succès
- Gestion des annulations

### 2. Base de données Firestore

#### Structure utilisateur
```typescript
interface FirestoreUserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp;
  isAdmin?: boolean;
  subscription?: {
    status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
    plan: 'free' | 'plus' | 'enterprise';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Timestamp;
    currentPeriodEnd?: Timestamp;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Timestamp;
    updatedAt: Timestamp;
  };
}
```

#### Service Stripe Admin (`/utils/stripeAdmin.ts`)
- `updateUserSubscription()` : Mise à jour du statut abonnement
- `getUserSubscription()` : Récupération du statut abonnement
- `hasActiveSubscription()` : Vérification d'abonnement actif
- `getSubscriptionPlan()` : Récupération du plan actuel

### 3. Interface utilisateur

#### Hook useSubscription (`/hooks/useSubscription.ts`)
```typescript
interface SubscriptionStatus {
  plan: 'free' | 'plus' | 'enterprise'
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  isActive: boolean
  isLoading: boolean
}
```

#### Composant PremiumGate (`/components/PremiumGate.tsx`)
- Restriction d'accès aux fonctionnalités Premium
- Affichage de l'offre d'upgrade
- Blur du contenu pour les utilisateurs non-Premium

### 4. API Routes

#### `/app/api/user/subscription/route.ts`
- Récupération du statut abonnement pour l'interface web
- Authentification Firebase requise

#### `/app/api/app/subscription/route.ts`
- Récupération du statut abonnement pour l'application desktop
- Format optimisé pour l'app desktop

## 🚀 Flow de paiement

### 1. Initiation du paiement
1. Utilisateur clique sur "Souscrire à Plus" sur `/settings/billing`
2. Appel à `/api/stripe/checkout` avec le `priceId`
3. Redirection vers Stripe Checkout

### 2. Après paiement réussi
1. Stripe redirige vers `/billing/success`
2. Webhook Stripe met à jour Firestore
3. Page de succès avec redirection vers l'app desktop
4. Interface web mise à jour automatiquement

### 3. Synchronisation app/web
1. L'app desktop peut appeler `/api/app/subscription`
2. Statut synchronisé en temps réel
3. Fonctionnalités débloquées automatiquement

## 🎨 Interface utilisateur

### Page de facturation (`/settings/billing`)
- Affichage du statut actuel
- Toggle Mensuel/Annuel
- Boutons d'action adaptés au statut
- Gestion des abonnements existants

### Page de succès (`/billing/success`)
- Confirmation de paiement
- Redirection automatique vers l'app
- Compte à rebours visuel

### Sidebar
- Affichage du statut abonnement (Claire Gratuit/Plus/Enterprise)
- Mise à jour en temps réel

## 🔒 Sécurité

### Authentification
- Tous les appels API requièrent un token Firebase
- Vérification des permissions utilisateur

### Validation Stripe
- Signature des webhooks vérifiée
- Gestion des erreurs de paiement
- Protection contre les tentatives de fraude

## 📱 Intégration app desktop

### URL de redirection
- `claire://billing-success` : Après paiement réussi
- L'app peut écouter cette URL pour déclencher des actions

### API de synchronisation
- L'app peut vérifier le statut abonnement
- Mise à jour des fonctionnalités disponibles
- Gestion des limitations Premium

## 🛠 Configuration requise

### Variables d'environnement
```bash
# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Admin
FIREBASE_PROJECT_ID=dedale-database
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Price IDs Stripe
- Mensuel : `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` → `price_1SHN9sAjfdK87nxfDtC0syHP`
- Annuel : `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID` → `price_1SLhBVAjfdK87nxfnDj2UcLJ`

## 🧪 Test

### Test local
1. Utiliser les clés Stripe en mode test
2. Configurer les webhooks Stripe vers ngrok
3. Tester le flow complet de paiement

### Test production
1. Configurer les variables d'environnement sur Vercel
2. Configurer les webhooks Stripe vers l'URL de production
3. Tester avec de vrais paiements (petits montants)

## 📊 Monitoring

### Logs importants
- Webhooks Stripe reçus
- Mises à jour Firestore
- Erreurs de paiement
- Tentatives d'accès non autorisées

### Métriques à suivre
- Taux de conversion Gratuit → Plus
- Taux d'annulation
- Erreurs de paiement
- Temps de réponse des APIs
