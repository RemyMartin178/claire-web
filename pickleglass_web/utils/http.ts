import config from '../env.config.js';

export function getApiBase(): string {
	// Priorité 1: même origine (serveur local embarqué)
	if (typeof window !== 'undefined' && window.location?.origin) {
		return window.location.origin.replace(/\/$/, '');
	}

	// Priorité 2: Variable d'environnement explicite
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
	}

	// Priorité 3: Configuration depuis env.config.js
	if (config.API_BASE_URL) {
		return config.API_BASE_URL.replace(/\/$/, '');
	}

	// Dernier recours: prod
	return 'https://app.clairia.app';
}


