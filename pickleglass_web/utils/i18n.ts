import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// @ts-ignore
import HttpBackend from 'i18next-http-backend';

// Initialisation d'i18n
if (!i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: 'fr', // Langue par défaut
      fallbackLng: 'fr',
      ns: ['translation'],
      defaultNS: 'translation',
      debug: false,
      interpolation: {
        escapeValue: false, // React gère déjà l'échappement
      },
      backend: {
        loadPath: '/locales/{{lng}}/translation.json',
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n; 