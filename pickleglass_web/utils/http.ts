export function getApiBase(): string {
	if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		const isLocal = host === 'localhost' || host === '127.0.0.1';
		return isLocal ? 'http://localhost:3001' : 'https://api.clairia.app';
	}
	return process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://api.clairia.app';
}


