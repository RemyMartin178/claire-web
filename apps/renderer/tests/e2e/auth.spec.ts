import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test('affiche une erreur avec des identifiants invalides', async ({ page }) => {
    await page.goto('/auth/login')

    await page.getByPlaceholder('exemple@email.com').fill('test-invalid@claire.app')
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe-12345')
    await page.getByRole('button', { name: 'Continuer' }).click()

    // Doit afficher une erreur, pas rediriger
    await expect(page.locator('.bg-red-50, [class*="error"]')).toBeVisible({ timeout: 8000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('le lien mot de passe oublié fonctionne', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByText('Mot de passe oublie').click()
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('le lien vers register fonctionne', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByText('Creer un compte').click()
    await expect(page).toHaveURL(/register/)
  })

  test('le bouton Google sign-in est visible', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('Se connecter avec Google')).toBeVisible()
  })
})
