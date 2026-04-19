# Runbook — Test E2E Stripe

À exécuter manuellement avant chaque mise en production touchant le billing.

## Prérequis

```bash
# Installer la CLI Stripe (une seule fois)
# Windows : https://github.com/stripe/stripe-cli/releases/latest
stripe --version

# Se connecter
stripe login
```

## 1. Démarrer l'écoute des webhooks

Dans un terminal dédié :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier la clé `whsec_...` affichée et la mettre dans `.env.local` :
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 2. Cas à tester — dans l'ordre

### 2a. Checkout réussi
```bash
stripe trigger checkout.session.completed
```
✅ Vérifier :
- Page `/billing/success` s'affiche avec le bon plan
- Webhook reçu (log dans le terminal stripe listen)
- Statut utilisateur mis à jour dans Firebase/DB
- `localStorage.subscription_cache` vidé

### 2b. Paiement échoué
```bash
stripe trigger payment_intent.payment_failed
```
✅ Vérifier :
- Aucun accès premium accordé
- Message d'erreur clair côté UI

### 2c. Annulation d'abonnement
```bash
stripe trigger customer.subscription.deleted
```
✅ Vérifier :
- Statut utilisateur repassé en "free" dans la DB
- UI billing reflète le changement au prochain refresh

### 2d. Renouvellement mensuel
```bash
stripe trigger invoice.payment_succeeded
```
✅ Vérifier :
- Webhook reçu et traité sans erreur 500
- Date de fin d'abonnement mise à jour si stockée

## 3. Test manuel complet (golden path)

1. Aller sur `/settings/billing`
2. Cliquer sur "Passer au plan Plus"
3. Utiliser la carte test Stripe : `4242 4242 4242 4242` / exp: `12/34` / CVC: `123`
4. Valider le paiement
5. Vérifier la redirection vers `/billing/success`
6. Vérifier le deeplink `claire://billing-success`
7. Vérifier que l'app desktop reflète le plan actif

## 4. Cartes de test utiles

| Scénario | Numéro |
|----------|--------|
| Succès | `4242 4242 4242 4242` |
| Déclinée | `4000 0000 0000 0002` |
| 3D Secure requis | `4000 0025 0000 3155` |
| Fonds insuffisants | `4000 0000 0000 9995` |

## 5. Checklist avant deploy billing

- [ ] `stripe listen` testé sans erreur
- [ ] Webhook `checkout.session.completed` reçu et traité
- [ ] Webhook `customer.subscription.deleted` reçu et traité
- [ ] Golden path manuel validé avec carte `4242...`
- [ ] Page `/billing/success` affiche le bon plan
- [ ] Deeplink `claire://` fonctionne
- [ ] `STRIPE_WEBHOOK_SECRET` en prod = la vraie clé (pas `whsec_test_...`)
