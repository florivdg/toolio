import { execFileSync } from 'node:child_process'
import { expect, type Page } from '@playwright/test'

/**
 * Restores the seeded wishlist and iTunes rows.
 *
 * Runs in a child process because the fixture script needs Bun's sqlite driver,
 * which the Playwright runner does not provide.
 */
export function resetFixtures() {
  execFileSync('bun', ['run', 'e2e/support/fixtures.ts'], {
    stdio: 'pipe',
    env: process.env,
  })
}

/** The account the seed script creates in the isolated e2e database. */
export const E2E_USER = {
  email: 'e2e@example.test',
  password: 'e2e-password-123',
}

/** Signs in through the real form and waits for the redirect to land. */
export async function signIn(page: Page, redirectTo = '/') {
  const target =
    redirectTo === '/'
      ? '/sign-in'
      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`

  await page.goto(target)
  await page.getByLabel('E-Mail').fill(E2E_USER.email)
  await page.getByLabel('Passwort').fill(E2E_USER.password)
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click()

  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'))
  expect(new URL(page.url()).pathname).toBe(redirectTo)
}

/**
 * Console errors the fixtures cause rather than the app.
 *
 * Seeded artwork points at example hosts that do not resolve, so the browser
 * logs a failed resource load. The app handles it — the image falls back to the
 * placeholder — but the console entry remains.
 */
const FIXTURE_NOISE =
  /ERR_NAME_NOT_RESOLVED|example\.(test|com)|itunes\.example/

/** Collects console errors and page errors for a test to assert on. */
export function watchForErrors(page: Page) {
  const errors: string[] = []

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (FIXTURE_NOISE.test(message.text())) return

    errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

  return errors
}
