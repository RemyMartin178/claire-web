// Configuration des variables d'environnement
const config = {
  // API Base URL - peut être surchargé par NEXT_PUBLIC_API_BASE_URL
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://app.clairia.app',
  
  // Web URL - pour l'interface utilisateur
  WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || 'https://app.clairia.app',
  
  // Mode de développement
  IS_DEV: process.env.NODE_ENV === 'development',
  
  // Mode de production
  IS_PROD: process.env.NODE_ENV === 'production'
};

export default config;