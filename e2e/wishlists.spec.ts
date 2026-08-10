import { expect, test, type Page } from '@playwright/test'
import { resetFixtures, signIn, watchForErrors } from './support/auth'

/**
 * The wishlist tool end to end. This is the area the refactor touched most —
 * the overview grid, the item table and both modals were all split apart — so
 * these drive the real UI rather than mounted components.
 */

/** A card in the overview grid, found by the wishlist it shows. */
function card(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: name })
}

/** Opens the seeded "Umzug" wishlist through the sidebar and waits for it. */
async function openUmzug(page: Page) {
  await page.goto('/tools/wishlists')
  await page.getByRole('link', { name: /Umzug/ }).click()
  await expect(item(page, 'Kaffeemühle')).toBeVisible()
}

/**
 * An item's actions button, which is the one element unique and visible per
 * item: the name itself is a heading only in the mobile card, so on desktop it
 * is not reachable by role.
 */
function item(page: Page, name: string) {
  return page.getByRole('button', { name: `Aktionen für ${name}` })
}

/** The overflow menu for one item, opened. */
async function openItemMenu(page: Page, itemName: string) {
  await item(page, itemName).click()
}

test.beforeEach(async ({ page }) => {
  resetFixtures()
  await signIn(page)
})

test.describe('wishlist overview', () => {
  test('lists the seeded wishlists with their item counts', async ({
    page,
  }) => {
    const errors = watchForErrors(page)
    await page.goto('/tools/wishlists')

    await expect(
      page.getByRole('heading', { name: 'Meine Wishlists' }),
    ).toBeVisible()
    await expect(card(page, 'Umzug')).toBeVisible()
    await expect(card(page, 'Geburtstag')).toBeVisible()
    await expect(
      card(page, 'Umzug').getByText('3', { exact: true }),
    ).toBeVisible()

    expect(errors).toEqual([])
  })

  test('previews the newest items with their prices', async ({ page }) => {
    await page.goto('/tools/wishlists')
    const umzug = card(page, 'Umzug')

    await expect(umzug.getByText('Neueste Artikel:')).toBeVisible()
    await expect(umzug.getByText('Kaffeemühle')).toBeVisible()
    await expect(umzug.getByText('89.90€')).toBeVisible()
  })

  test('says so for a wishlist with no items', async ({ page }) => {
    await page.goto('/tools/wishlists')

    await expect(
      card(page, 'Geburtstag').getByText('Noch keine Artikel hinzugefügt'),
    ).toBeVisible()
  })

  test('opens a wishlist from its card button', async ({ page }) => {
    await page.goto('/tools/wishlists')
    await card(page, 'Umzug')
      .getByRole('button', { name: 'Wishlist anzeigen' })
      .click()

    await page.waitForURL(/\/tools\/wishlists\/.+/)
    await expect(item(page, 'Kaffeemühle')).toBeVisible()
  })

  test('lists every wishlist in the sidebar with its count', async ({
    page,
  }) => {
    await page.goto('/tools/wishlists')

    const nav = page.locator('nav')
    await expect(
      nav.getByRole('link', { name: 'Alle Wishlists' }),
    ).toBeVisible()
    await expect(nav.getByRole('link', { name: /Umzug/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Geburtstag/ })).toBeVisible()
  })

  test('creates a wishlist and shows it straight away', async ({ page }) => {
    await page.goto('/tools/wishlists')
    await page.getByRole('button', { name: 'Neue Wishlist' }).click()

    await page.getByLabel('Name *').fill('Weihnachten')
    await page.getByLabel('Beschreibung (optional)').fill('Für die Familie')
    await page.getByRole('button', { name: 'Erstellen', exact: true }).click()

    await expect(card(page, 'Weihnachten')).toBeVisible()
    await expect(page.getByText('Wishlist erfolgreich erstellt!')).toBeVisible()
  })
})

test.describe('wishlist items', () => {
  test('shows every seeded item with its price and status', async ({
    page,
  }) => {
    const errors = watchForErrors(page)
    await openUmzug(page)

    await expect(item(page, 'Kaffeemühle')).toBeVisible()
    await expect(item(page, 'Schreibtischlampe')).toBeVisible()
    await expect(item(page, 'Regal')).toBeVisible()

    // Each status renders twice — once in the desktop row, once in the mobile
    // card that CSS hides — so these assert the first, visible one.
    await expect(page.getByText('Aktiv', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByText('Gekauft', { exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('Inaktiv', { exact: true }).first(),
    ).toBeVisible()

    expect(errors).toEqual([])
  })

  test('totals the prices, separating what is still to buy', async ({
    page,
  }) => {
    await openUmzug(page)

    // 89.90 + 42.50 + 120 = 252.40 overall; only Kaffeemühle is active and
    // unpurchased, so 89.90 is what is still outstanding.
    await expect(page.getByText('252,40')).toBeVisible()
    await expect(page.getByText('89,90 € aktiv')).toBeVisible()
    await expect(page.getByText('3 von 3 Artikeln')).toBeVisible()
  })

  test('filters down to the purchased items', async ({ page }) => {
    await openUmzug(page)

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Gekauft', exact: true }).click()

    await expect(item(page, 'Schreibtischlampe')).toBeVisible()
    await expect(item(page, 'Kaffeemühle')).toHaveCount(0)
    await expect(page.getByText('1 von 3 Artikeln')).toBeVisible()
  })

  test('creates an item and shows it in the list', async ({ page }) => {
    await openUmzug(page)

    await page.getByRole('button', { name: 'Artikel hinzufügen' }).click()
    await page.getByLabel('Name *').fill('Teekanne')
    await page.getByLabel('Link/URL *').fill('https://example.test/teekanne')
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()

    await expect(item(page, 'Teekanne')).toBeVisible()
    await expect(page.getByText('4 von 4 Artikeln')).toBeVisible()
  })

  test('offers all five generated priority options', async ({ page }) => {
    await openUmzug(page)

    await page.getByRole('button', { name: 'Artikel hinzufügen' }).click()
    await page.getByRole('button', { name: /Mehr Optionen/ }).click()
    await page.getByRole('combobox').last().click()

    // Generated from PRIORITY_OPTIONS rather than written out five times.
    await expect(page.getByRole('option')).toHaveCount(5)
    await expect(
      page.getByRole('option', { name: 'Niedrig (1)' }),
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Sehr hoch (5)' }),
    ).toBeVisible()
  })

  test('edits an item and keeps the change', async ({ page }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Kaffeemühle')
    await page.getByRole('menuitem', { name: 'Bearbeiten' }).click()

    const name = page.getByLabel('Name *')
    await expect(name).toHaveValue('Kaffeemühle')
    await name.fill('Kaffeemühle Pro')
    await page.getByRole('button', { name: 'Speichern', exact: true }).click()

    await expect(item(page, 'Kaffeemühle Pro')).toBeVisible()
  })

  test('marks an item as bought and flips its status', async ({ page }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Regal')
    await page.getByRole('menuitem', { name: 'Als gekauft markieren' }).click()

    await expect(page.getByText('Artikel als gekauft markiert!')).toBeVisible()

    // Filtering proves the change stuck rather than just toasting.
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Gekauft', exact: true }).click()
    await expect(page.getByText('2 von 3 Artikeln')).toBeVisible()
  })

  test('deactivates an item', async ({ page }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Kaffeemühle')
    await page.getByRole('menuitem', { name: 'Deaktivieren' }).click()

    await expect(page.getByText('Artikel deaktiviert!')).toBeVisible()
  })

  test('deletes an item after confirmation', async ({ page }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Schreibtischlampe')
    await page.getByRole('menuitem', { name: 'Löschen' }).click()

    await expect(page.getByText(/Sind Sie sicher/)).toBeVisible()
    await page.getByRole('button', { name: 'Löschen', exact: true }).click()

    await expect(item(page, 'Schreibtischlampe')).toHaveCount(0)
    await expect(page.getByText('2 von 2 Artikeln')).toBeVisible()
  })

  test('keeps the item when the delete dialog is dismissed', async ({
    page,
  }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Regal')
    await page.getByRole('menuitem', { name: 'Löschen' }).click()
    await page.getByRole('button', { name: 'Abbrechen' }).click()

    await expect(item(page, 'Regal')).toBeVisible()
  })

  test('moves an item to another wishlist', async ({ page }) => {
    await openUmzug(page)
    await openItemMenu(page, 'Regal')
    await page.getByRole('menuitem', { name: /verschieben/i }).click()

    await page.getByRole('combobox').last().click()
    await page.getByRole('option', { name: 'Geburtstag' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /verschieben/i })
      .click()

    await expect(item(page, 'Regal')).toHaveCount(0)
  })
})
