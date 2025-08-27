import config from '../env.config.js';

export function getApiBase(): string {
	// Priorité 1: Variable d'environnement explicite
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
	}
	
	// Priorité 2: Configuration depuis env.config.js
	if (config.API_BASE_URL) {
		return config.API_BASE_URL.replace(/\/$/, '');
	}
	
	// Priorité 3: Logique automatique basée sur l'environnement
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		const isLocal = host === 'localhost' || host === '127.0.0.1';
		return isLocal ? 'http://localhost:3001' : 'https://app.clairia.app';
	}
	
	return process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://app.clairia.app';
}


