export function getApiBase(): string {
  // priorité: same-origin (serveur local embarqué par l'app)
  if (typeof window !== 'undefined') return window.location.origin;
  // fallback: variable d'env (packagée par l'app)
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  // dernière chance: prod (évite le hard fail)
  return 'https://app.clairia.app';
}
