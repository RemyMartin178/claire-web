#!/bin/bash
# Backup manuel de la base Neon vers un fichier .sql.gz daté
# Usage: ./scripts/backup.sh
# Prérequis: pg_dump installé, DATABASE_URL dans l'env

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Erreur: DATABASE_URL non défini"
  exit 1
fi

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

FILENAME="backup_$(date +%Y%m%d_%H%M%S).sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "Dump en cours → $FILEPATH"
pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"
echo "Backup terminé : $FILEPATH ($(du -sh "$FILEPATH" | cut -f1))"

# Supprimer les backups de plus de 30 jours
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
echo "Anciens backups nettoyés."
