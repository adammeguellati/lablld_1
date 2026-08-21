import { test, expect } from '@playwright/test'

/**
 * LABLLD smoke suite.
 *
 * WHAT THIS COVERS, AND WHAT IT DELIBERATELY CANNOT
 *
 * The suite runs against a production build with PLACEHOLDER env and reaches no
 * real service — that is the standing constraint, not a shortcut. It means there
 * is no auth backend, so there is no session, so nothing here can log in.
 *
 * Every test below is therefore one of two kinds: a page that renders without a
 * session, or a route that correctly REFUSES without one. Both are real smoke
 * signals — between them they exercise the proxy, both route groups, the auth
 * screens and the server actions' failure path.
 *
 * NOT COVERED, and it needs a reachable Supabase rather than more tests here:
 * a successful login for either provisioned account, the catalogue rendering
 * products, and the admin orders list rendering rows. Tracked on the card.
 */

const MERCHANT_PROTECTED = ['/dashboard', '/catalog', '/products', '/orders', '/settings']
const ADMIN_PROTECTED = ['/admin/dashboard', '/admin/orders', '/admin/products', '/admin/merchants', '/admin/labels']

test.describe('public and auth screens render', () => {
  test('login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    // The password manager must be offered the SAVED credential. This field
    // carried autoComplete="new-password" until W1, which suppressed exactly
    // that, so the attribute is asserted rather than assumed.
    await expect(page.locator('input[name="password"]')).toHaveAttribute('autocomplete', 'current-password')
    await expect(page.getByRole('link', { name: /olvidaste/i })).toBeVisible()
  })

  test('register', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[name="full_name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('forgot-password is reachable from login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /olvidaste/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('terminos', async ({ page }) => {
    await page.goto('/terminos')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('unauthenticated routes refuse — the negative case', () => {
  for (const route of MERCHANT_PROTECTED) {
    test(`merchant ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  for (const route of ADMIN_PROTECTED) {
    test(`admin ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('/ redirects rather than rendering a shell', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/reset-password without a recovery session shows the expired state, not the form', async ({ page }) => {
    // The security-relevant half: if this ever rendered the form without a
    // session, anyone could open it and the only thing standing between them and
    // a password change would be the server action's own guard.
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /Ese enlace/ })).toBeVisible()
    await expect(page.locator('input[name="password"]')).toHaveCount(0)
  })
})

test.describe('failure paths stay Spanish', () => {
  test('login against an unreachable backend fails closed, in Spanish', async ({ page }) => {
    // The regression guard for two separate defects. INC-02: an unusable
    // Supabase configuration used to reach the browser as a blank error page.
    // And W5: the transport error underneath it reached the merchant as Node's
    // own English, "fetch failed", inside a Spanish error box.
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('merchant@placeholder.invalid')
    await page.locator('input[name="password"]').fill('whatever-123')
    await page.getByRole('button', { name: /Iniciar sesión/ }).click()

    await expect(page.getByText(/El servicio no está disponible/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/fetch failed/i)).toHaveCount(0)
    // Failing closed means staying put, not navigating into a broken session.
    await expect(page).toHaveURL(/\/login/)
  })

  test('an empty login is refused before any network call', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Iniciar sesión/ }).click()
    // Native required-field validation keeps us here; nothing is submitted.
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })
})
