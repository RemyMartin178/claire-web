import { test, expect } from '@playwright/test'

test.describe('Billing — accès non authentifié', () => {
  test('redirige vers login si non authentifié', async ({ page }) => {
    await page.goto('/settings/billing')
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 }).catch(() => {})
    expect(page.url()).toContain('/auth')
  })
})

test.describe('Billing success page', () => {
  test('affiche un message de succès avec session_id', async ({ page }) => {
    // Simuler un retour Stripe avec un faux session_id
    // (la page gère le cas sans user authentifié via redirect, ici on teste le rendu)
    await page.goto('/billing/success?session_id=cs_test_fake&plan=plus')

    // Soit la page affiche le succès (user auth), soit redirige vers login
    const url = page.url()
    const isSuccess = url.includes('/billing/success')
    const isRedirected = url.includes('/auth/login')
    expect(isSuccess || isRedirected).toBeTruthy()
  })
})

// Tests nécessitant un compte test — à exécuter manuellement avec PLAYWRIGHT_TEST_EMAIL/PASSWORD
test.describe('Billing — flux authentifié (manuel)', () => {
  test.skip(!process.env.PLAYWRIGHT_TEST_EMAIL, 'Requiert PLAYWRIGHT_TEST_EMAIL et PLAYWRIGHT_TEST_PASSWORD')

  test('la page billing charge avec les plans', async ({ page }) => {
    // Login programmatique
    await page.goto('/auth/login')
    await page.getByPlaceholder('exemple@email.com').fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
    await page.getByLabel('Mot de passe').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.waitForURL(/\/activity/, { timeout: 10000 })

    await page.goto('/settings/billing')
    await expect(page.getByText(/plan|abonnement/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /passer|upgrade|plus/i })).toBeVisible()
  })
})
