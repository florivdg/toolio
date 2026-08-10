import { expect, test } from '@playwright/test'
import { resetFixtures, signIn, watchForErrors } from './support/auth'

/**
 * The mobile layout, which is the half of the item list that desktop tests
 * never touch: the table row is hidden below the breakpoint and a card renders
 * in its place. Both were moved during the refactor, so both are checked.
 */

test.beforeEach(async ({ page }) => {
  resetFixtures()
  await signIn(page)
})

test('renders the wishlist overview without a horizontal scrollbar', async ({
  page,
}) => {
  const errors = watchForErrors(page)
  await page.goto('/tools/wishlists')
  await expect(
    page.getByRole('heading', { name: 'Meine Wishlists' }),
  ).toBeVisible()

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('swaps the item table for cards on a phone', async ({ page }) => {
  await page.goto('/tools/wishlists')
  await page.getByRole('link', { name: /Umzug/ }).click()
  await expect(
    page.getByRole('button', { name: 'Aktionen für Kaffeemühle' }),
  ).toBeVisible()

  // The column header only exists in the desktop grid, which is hidden here.
  await expect(
    page.getByText('Name & Beschreibung', { exact: true }),
  ).toBeHidden()

  // On mobile the item name is a heading inside the card.
  await expect(page.getByRole('heading', { name: 'Kaffeemühle' })).toBeVisible()
})

test('keeps the item list within the viewport', async ({ page }) => {
  await page.goto('/tools/wishlists')
  await page.getByRole('link', { name: /Umzug/ }).click()
  await expect(
    page.getByRole('button', { name: 'Aktionen für Kaffeemühle' }),
  ).toBeVisible()

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('can still act on an item from the mobile card', async ({ page }) => {
  await page.goto('/tools/wishlists')
  await page.getByRole('link', { name: /Umzug/ }).click()

  await page.getByRole('button', { name: 'Aktionen für Regal' }).click()
  await page.getByRole('menuitem', { name: 'Als gekauft markieren' }).click()

  await expect(page.getByText('Artikel als gekauft markiert!')).toBeVisible()
})

test('renders the watchlist grid on a phone', async ({ page }) => {
  const errors = watchForErrors(page)
  await page.goto('/tools/itunes/watchlist')

  await expect(page.getByText('Interstellar').first()).toBeVisible()

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('renders the sign-in card on a phone', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/sign-in')

  await expect(
    page.getByRole('button', { name: 'Anmelden', exact: true }),
  ).toBeVisible()

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
