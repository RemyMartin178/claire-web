# Runbook Backend — Claire

## Restore DB (incident)

```bash
# 1. Identifier le backup à restaurer
ls -lh backups/

# 2. Restaurer
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

Si le backup Neon natif est disponible (dashboard Neon → Branches → Restore) : préférer cette option, plus rapide.

## Health check manuel

```bash
curl https://[ton-backend-railway]/health
```

Réponse attendue : `{"status":"healthy",...}`

## Redémarrage Railway

Via le dashboard Railway → service → Redeploy, ou :
```bash
railway up --service backend
```

## Variables d'env manquantes

Si le backend démarre mais répond 500 : vérifier les variables dans Railway dashboard.
Variables critiques : `DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `JWT_SECRET`

## Contacts

- Railway status : https://status.railway.app
- Neon status : https://neonstatus.com
