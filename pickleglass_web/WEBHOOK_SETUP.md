# 🔥 Configuration Webhooks Stripe Automatiques

## **Étapes pour configurer les webhooks automatiques :**

### **1. Dans le Dashboard Stripe :**
1. Va sur **Developers > Webhooks**
2. Clique sur **"Add endpoint"**
3. **URL du webhook :** `https://ton-domaine.com/api/stripe/webhook`
4. **Événements à écouter :**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### **2. Variables d'environnement :**
```bash
STRIPE_WEBHOOK_SECRET=whsec_ton_secret_ici
CRON_SECRET=ton_secret_cron_ici
```

### **3. Test du webhook :**
```bash
# Test local avec Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## **🎯 Résultat :**

✅ **Mise à jour automatique** des dates d'abonnement
✅ **Synchronisation quotidienne** à 2h du matin
✅ **Gestion des erreurs** de paiement
✅ **Annulation automatique** des abonnements

## **📊 Événements gérés :**

- **Nouvel abonnement** → Dates correctes depuis Stripe
- **Renouvellement** → Mise à jour automatique
- **Annulation** → Statut mis à jour
- **Échec de paiement** → Gestion automatique

## **🚀 Avantages :**

- **100% automatique** - plus besoin de scripts manuels
- **Temps réel** - mise à jour instantanée
- **Scalable** - fonctionne avec des milliers d'utilisateurs
- **Fiable** - comme les vrais SaaS (Stripe, Vercel, etc.)
