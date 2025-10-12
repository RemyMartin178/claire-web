# Configuration Stripe pour Claire

## 1. Variables d'environnement à ajouter dans `.env.local`

```bash
# Stripe Configuration (Mode Test au début)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (à créer dans Stripe Dashboard)
STRIPE_PLUS_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Créer les produits dans Stripe Dashboard

1. Va sur https://dashboard.stripe.com/test/products
2. Clique sur "Add product"
3. Crée deux produits:

### **Claire Plus**
- Name: `Claire Plus`
- Description: `Plan Plus avec accès aux modèles premium`
- Pricing: `10 EUR` / mois (recurring)
- Copie le `Price ID` (commence par `price_...`)

### **Claire Enterprise**
- Name: `Claire Enterprise`
- Description: `Plan Enterprise avec support prioritaire`
- Pricing: `30 EUR` / mois (recurring)
- Copie le `Price ID` (commence par `price_...`)

## 3. Récupérer les clés API

1. Va sur https://dashboard.stripe.com/test/apikeys
2. Copie:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...) - Clique sur "Reveal test key"

## 4. Configurer le Webhook

1. Va sur https://dashboard.stripe.com/test/webhooks
2. Clique sur "Add endpoint"
3. URL: `http://localhost:3000/api/stripe/webhook` (pour test local)
4. Événements à écouter:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie le **Signing secret** (whsec_...)

## 5. Passer en mode Production

Une fois testé, change pour les clés Production:
- https://dashboard.stripe.com/apikeys (sans `/test/`)
- Crée les mêmes produits en mode live
- Configure le webhook avec l'URL de production: `https://app.clairia.app/api/stripe/webhook`

