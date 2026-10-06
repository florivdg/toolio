import { expect, test } from '@playwright/test'
import { E2E_USER, signIn } from './support/auth'

/**
 * Every route is protected by the middleware, so these cover the gate itself:
 * who gets redirected where, and that the redirect target survives sign-in.
 */

test.describe('authentication gate', () => {
  test('redirects an anonymous visitor to sign-in', async ({ page }) => {
    await page.goto('/')

    expect(new URL(page.url()).pathname).toBe('/sign-in')
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible()
  })

  test('remembers where an anonymous visitor was going', async ({ page }) => {
    await page.goto('/tools/wishlists')

    const url = new URL(page.url())
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('redirect')).toBe('/tools/wishlists')
  })

  test('protects the API as well as the pages', async ({ request }) => {
    const response = await request.get('/api/wishlists', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(302)
    expect(response.headers()['location']).toContain('/sign-in')
  })

  test('answers an anonymous price-update call with 401, not a redirect', async ({
    request,
  }) => {
    // JSON like the cron sends; Astro refuses a cross-site POST without a
    // content type with its own 403 before the route is reached.
    const response = await request.post('/api/itunes/update-prices', {
      data: {},
      maxRedirects: 0,
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(401)
    expect((await response.json()).success).toBe(false)
  })

  test('no longer runs the price update on GET', async ({ request }) => {
    const response = await request.get('/api/itunes/update-prices', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(405)
  })

  test('rejects wrong credentials without signing in', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('E-Mail').fill(E2E_USER.email)
    await page.getByLabel('Passwort').fill('falsches-passwort')
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click()

    await expect(page.getByText('E-Mail oder Passwort falsch')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/sign-in')
  })

  test('signs in and lands on the home page', async ({ page }) => {
    await signIn(page)

    await expect(page.locator('body')).not.toContainText('Anmelden', {
      timeout: 5_000,
    })
  })

  test('returns a signed-in visitor to where they were going', async ({
    page,
  }) => {
    await signIn(page, '/tools/wishlists')

    await expect(
      page.getByRole('heading', { name: 'Meine Wishlists' }),
    ).toBeVisible()
  })

  test('sends an already signed-in visitor away from sign-in', async ({
    page,
  }) => {
    await signIn(page)
    await page.goto('/sign-in')

    await page.waitForURL('**/')
    expect(new URL(page.url()).pathname).toBe('/')
  })
})
