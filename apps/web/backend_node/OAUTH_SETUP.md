# Configuration OAuth pour les intégrations Claire

## Google (Calendar, Gmail, Drive)

### 1. Créer un projet Google Cloud

1. Va sur [Google Cloud Console](https://console.cloud.google.com)
2. Clique sur "Créer un projet"
3. Donne un nom au projet (ex: "Claire AI")
4. Clique sur "Créer"

### 2. Configurer l'écran de consentement OAuth

1. Dans le menu, va à **APIs & Services** > **OAuth consent screen**
2. Choisis **External** (pour commencer) puis **Create**
3. Remplis :
   - **App name**: Claire AI Assistant
   - **User support email**: ton email
   - **Developer contact email**: ton email
4. Clique **Save and Continue**
5. Sur **Scopes**, clique **Add or Remove Scopes** et ajoute :
   - `https://www.googleapis.com/auth/calendar` (Google Calendar)
   - `https://www.googleapis.com/auth/gmail.readonly` (Gmail lecture)
   - `https://www.googleapis.com/auth/gmail.send` (Gmail envoi)
   - `https://www.googleapis.com/auth/drive.readonly` (Google Drive lecture)
6. Clique **Update** puis **Save and Continue**
7. Sur **Test users**, ajoute ton email de test
8. Clique **Save and Continue**

### 3. Créer les credentials OAuth

1. Va à **APIs & Services** > **Credentials**
2. Clique **Create Credentials** > **OAuth 2.0 Client ID**
3. Choisis **Web application**
4. Donne un nom (ex: "Claire Backend")
5. **Authorized JavaScript origins** :
   ```
   http://localhost:3000
   http://localhost:64952
   https://app.clairia.app
   https://claire-web-production.up.railway.app
   ```
6. **Authorized redirect URIs** :
   ```
   http://localhost:3001/api/v1/tools/google_calendar/auth/callback
   http://localhost:3001/api/v1/tools/gmail/auth/callback
   http://localhost:3001/api/v1/tools/google_drive/auth/callback
   https://claire-web-production.up.railway.app/api/v1/tools/google_calendar/auth/callback
   https://claire-web-production.up.railway.app/api/v1/tools/gmail/auth/callback
   https://claire-web-production.up.railway.app/api/v1/tools/google_drive/auth/callback
   ```
7. Clique **Create**
8. **Copie le Client ID et Client Secret** (tu ne verras le secret qu'une fois !)

### 4. Activer les APIs Google

1. Va à **APIs & Services** > **Library**
2. Active ces APIs :
   - Google Calendar API
   - Gmail API
   - Google Drive API

### 5. Configurer dans Railway

1. Va sur [Railway](https://railway.app)
2. Ouvre ton projet Claire Backend
3. Va dans **Variables**
4. Ajoute ces variables :
   ```
   GOOGLE_CLIENT_ID=ton_client_id_ici
   GOOGLE_CLIENT_SECRET=ton_client_secret_ici
   ```
5. Sauvegarde et redéploie

## Slack

### 1. Créer une Slack App

1. Va sur [Slack API](https://api.slack.com/apps)
2. Clique **Create New App** > **From scratch**
3. Donne un nom et choisis ton workspace

### 2. Configurer OAuth

1. Dans le menu, va à **OAuth & Permissions**
2. **Redirect URLs** :
   ```
   http://localhost:3001/api/v1/tools/slack/auth/callback
   https://claire-web-production.up.railway.app/api/v1/tools/slack/auth/callback
   ```
3. **Scopes** (Bot Token) :
   - `channels:read`
   - `chat:write`
   - `users:read`
4. Clique **Install to Workspace**
5. Copie le **Client ID** et **Client Secret**

### 3. Configurer dans Railway

```
SLACK_CLIENT_ID=ton_client_id
SLACK_CLIENT_SECRET=ton_client_secret
```

## GitHub

### 1. Créer un GitHub App

1. Va dans les **Settings** de ton compte GitHub
2. **Developer settings** > **OAuth Apps** > **New OAuth App**
3. Remplis :
   - **Application name**: Claire AI
   - **Homepage URL**: https://clairia.app
   - **Authorization callback URL**: 
     ```
     http://localhost:3001/api/v1/tools/github/auth/callback
     https://claire-web-production.up.railway.app/api/v1/tools/github/auth/callback
     ```
4. Clique **Register application**
5. Copie le **Client ID**
6. Génère et copie le **Client Secret**

### 2. Configurer dans Railway

```
GITHUB_CLIENT_ID=ton_client_id
GITHUB_CLIENT_SECRET=ton_client_secret
```

## Notion

### 1. Créer une Notion Integration

1. Va sur [Notion Integrations](https://www.notion.so/my-integrations)
2. Clique **New integration**
3. Donne un nom et choisis un workspace
4. **Capabilities** : coche **Read content** et **Update content**
5. Clique **Submit**
6. Copie le **OAuth client ID** et **OAuth client secret**

### 2. Configurer dans Railway

```
NOTION_CLIENT_ID=ton_client_id
NOTION_CLIENT_SECRET=ton_client_secret
```

## Atlassian (Jira/Confluence)

### 1. Créer une Atlassian App

1. Va sur [Atlassian Developer](https://developer.atlassian.com/console)
2. Crée une nouvelle app
3. Note le **Client ID** et **Client Secret**

### 2. Configurer dans Railway

```
ATLASSIAN_OAUTH_CLIENT_ID=ton_client_id
ATLASSIAN_OAUTH_CLIENT_SECRET=ton_client_secret
```

## Variables à ajouter dans Railway

Voici toutes les variables à configurer :

```bash
# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Slack
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

# GitHub
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Notion
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx

# Atlassian
ATLASSIAN_OAUTH_CLIENT_ID=xxx
ATLASSIAN_OAUTH_CLIENT_SECRET=xxx

# Clé d'encryption pour les credentials
CREDENTIAL_ENCRYPTION_KEY=une_clé_secrète_aléatoire

# URL du backend
API_BASE_URL=https://claire-web-production.up.railway.app

# Database
DATABASE_URL=postgresql://...
```

## Important

- Garde tes secrets OAuth **privés** ! Ne les commite jamais dans Git
- Génère une clé aléatoire pour `CREDENTIAL_ENCRYPTION_KEY`
- Après avoir ajouté les variables, redéploie Railway

## Test

Une fois configuré :
1. Va sur https://app.clairia.app/tools
2. Trouve Google Calendar
3. Clique sur le bouton de configuration (icône verte)
4. Authentifie-toi avec Google
5. Teste l'intégration !

