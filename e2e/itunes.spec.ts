import { expect, test, type Page } from '@playwright/test'
import { resetFixtures, signIn, watchForErrors } from './support/auth'

/**
 * The iTunes tool. Search talks to Apple, so the search results themselves are
 * stubbed at the network boundary — what is verified here is how the page maps
 * a response onto cards, and the watchlist round trip against the database.
 */

/** Canned Apple search payload, so the run does not depend on the real API. */
async function stubItunesSearch(page: Page, results: unknown[]) {
  await page.route('**/api/itunes/search**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        resultCount: results.length,
        results,
      }),
    }),
  )
}

const MOVIE = {
  wrapperType: 'track',
  kind: 'feature-movie',
  trackId: 5001,
  trackName: 'Dune',
  artistName: 'Denis Villeneuve',
  trackViewUrl: 'https://itunes.example/dune',
  artworkUrl100: 'https://itunes.example/art/100x100bb.jpg',
  trackPrice: 13.99,
  trackHdPrice: 16.99,
  releaseDate: '2021-10-22T07:00:00Z',
  primaryGenreName: 'Sci-Fi',
  country: 'DEU',
  currency: 'EUR',
}

test.beforeEach(async ({ page }) => {
  resetFixtures()
  await signIn(page)
})

test.describe('iTunes watchlist', () => {
  test('lists the stored item with its German label and price', async ({
    page,
  }) => {
    const errors = watchForErrors(page)
    await page.goto('/tools/itunes/watchlist')

    await expect(page.getByText('Interstellar').first()).toBeVisible()
    await expect(page.getByText('Christopher Nolan').first()).toBeVisible()
    // entityType feature-movie maps to the German label.
    await expect(page.getByText('Film').first()).toBeVisible()
    // The HD price wins over the standard one.
    await expect(page.getByText('16,99', { exact: false })).toHaveCount(0)
    await expect(page.getByText('12,99 €').first()).toBeVisible()
    await expect(page.getByText('1 Element', { exact: true })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('links out to iTunes in a new tab', async ({ page }) => {
    await page.goto('/tools/itunes/watchlist')

    const link = page.getByRole('link', { name: /In iTunes ansehen/ })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  })

  test('removes an item only after confirmation', async ({ page }) => {
    await page.goto('/tools/itunes/watchlist')

    await page.getByRole('button', { name: /Aus Watchlist entfernen/ }).click()
    await expect(page.getByText(/Sind Sie sicher/)).toBeVisible()
    await page.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(page.getByText('Interstellar').first()).toBeVisible()

    await page.getByRole('button', { name: /Aus Watchlist entfernen/ }).click()
    await page.getByRole('button', { name: 'Ja, entfernen' }).click()

    await expect(page.getByText('Ihre Watchlist ist leer.')).toBeVisible()
  })

  test('shows the empty state once nothing is left', async ({ page }) => {
    await page.goto('/tools/itunes/watchlist')
    await page.getByRole('button', { name: /Aus Watchlist entfernen/ }).click()
    await page.getByRole('button', { name: 'Ja, entfernen' }).click()

    await expect(
      page.getByText('Suchen Sie nach Inhalten und fügen Sie sie zu Ihrer'),
    ).toBeVisible()
  })
})

test.describe('iTunes search', () => {
  test('invites a search before anything has been typed', async ({ page }) => {
    await page.goto('/tools/itunes/search')

    await expect(
      page.getByText('Geben Sie einen Suchbegriff ein'),
    ).toBeVisible()
  })

  test('renders a card per result', async ({ page }) => {
    const errors = watchForErrors(page)
    await stubItunesSearch(page, [MOVIE])
    await page.goto('/tools/itunes/search')

    await page.getByRole('searchbox').fill('dune')
    await page.getByRole('button', { name: 'Suchen' }).click()

    await expect(page.getByText('Dune').first()).toBeVisible()
    await expect(page.getByText('Denis Villeneuve').first()).toBeVisible()
    // getResultPrice prefers the HD price.
    await expect(page.getByText('16,99 €').first()).toBeVisible()

    // The fixture artwork host does not resolve, so this also proves the
    // onerror fallback swaps in the placeholder.
    await expect(page.locator('img[src="/placeholder-image.svg"]')).toHaveCount(
      1,
    )

    expect(errors).toEqual([])
  })

  test('reports an empty result set', async ({ page }) => {
    await stubItunesSearch(page, [])
    await page.goto('/tools/itunes/search')

    await page.getByRole('searchbox').fill('nichts')
    await page.getByRole('button', { name: 'Suchen' }).click()

    await expect(page.getByText('Keine Ergebnisse gefunden')).toBeVisible()
  })

  test('adds a result to the watchlist and it survives a reload', async ({
    page,
  }) => {
    await stubItunesSearch(page, [MOVIE])
    await page.goto('/tools/itunes/search')
    await page.getByRole('searchbox').fill('dune')
    await page.getByRole('button', { name: 'Suchen' }).click()
    await expect(page.getByText('Dune').first()).toBeVisible()

    // The add endpoint looks the item up at Apple, so that call is stubbed too.
    await page.route('**/api/itunes/add', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, mediaItemId: 'stub' }),
      }),
    )

    await page.getByRole('button', { name: 'Zur Sammlung hinzufügen' }).click()
    await expect(page.getByText('Element hinzugefügt')).toBeVisible()
  })
})

test.describe('documentation', () => {
  test('lists the docs and opens one', async ({ page }) => {
    const errors = watchForErrors(page)
    await page.goto('/docs')

    await expect(
      page.getByRole('heading', { name: 'Dokumentation' }),
    ).toBeVisible()
    const first = page.locator('a[href^="/docs/"]').first()
    await expect(first).toBeVisible()
    await first.click()

    await page.waitForURL(/\/docs\/.+/)
    expect(errors).toEqual([])
  })

  test('lists the tools', async ({ page }) => {
    await page.goto('/tools')

    await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible()
    await expect(page.getByText('Tool öffnen').first()).toBeVisible()
  })
})
