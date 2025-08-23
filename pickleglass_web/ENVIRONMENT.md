# Configuration des Variables d'Environnement

## Variables Disponibles

### API Configuration

#### `NEXT_PUBLIC_API_BASE_URL`
- **Description** : URL de base pour les appels API
- **Valeur par défaut** : `https://app.clairia.app`
- **Exemple** : `https://api.clairia.app` ou `http://localhost:3001`

#### `NEXT_PUBLIC_API_URL` (Legacy)
- **Description** : Ancienne variable pour l'URL API (maintenue pour compatibilité)
- **Priorité** : Plus haute que `NEXT_PUBLIC_API_BASE_URL`

### Web Configuration

#### `NEXT_PUBLIC_WEB_URL`
- **Description** : URL de base pour l'interface utilisateur
- **Valeur par défaut** : `https://app.clairia.app`

## Ordre de Priorité

1. `NEXT_PUBLIC_API_URL` (legacy, priorité maximale)
2. `NEXT_PUBLIC_API_BASE_URL` (nouvelle variable)
3. Configuration automatique basée sur l'environnement

## Exemples d'Utilisation

### Développement Local
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

### Production
```bash
NEXT_PUBLIC_API_BASE_URL=https://app.clairia.app
NEXT_PUBLIC_WEB_URL=https://app.clairia.app
```

### API Séparée
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.clairia.app
NEXT_PUBLIC_WEB_URL=https://app.clairia.app
```

## Fichier de Configuration

Le fichier `env.config.js` centralise la configuration et peut être modifié pour changer les valeurs par défaut.
