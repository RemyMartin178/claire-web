import { test, expect } from '@playwright/test'

const PROTECTED_ROUTES = [
  '/activity',
  '/settings',
  '/settings/billing',
  '/settings/models',
  '/knowledge-base',
  '/tools',
  '/ai-agents',
  '/chat',
  '/calendar',
]

test.describe('Routes protégées', () => {
  test('redirige vers /auth/login si non authentifié', async ({ page }) => {
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route)
      // Attendre la redirection ou la présence du formulaire de login
      await page.waitForURL(/\/auth\/login|\/auth\/register/, { timeout: 5000 }).catch(() => {})
      const url = page.url()
      const isAuthPage = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/')
      expect(isAuthPage, `Route ${route} devrait rediriger vers auth, a redirigé vers ${url}`).toBeTruthy()
    }
  })

  test('page 404 fonctionne', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas')
    await expect(page.getByText(/introuvable|404/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Pages publiques', () => {
  test('la page login charge correctement', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('Connexion Claire')).toBeVisible()
    await expect(page.getByPlaceholder('exemple@email.com')).toBeVisible()
  })

  test('la page register charge correctement', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByRole('button', { name: /créer|s'inscrire|commencer/i })).toBeVisible()
  })
})
