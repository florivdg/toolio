/**
 * Builds an isolated database for the e2e run: migrations, a test user and the
 * fixtures.
 *
 * Runs before Playwright, because Playwright starts the web server before any
 * of its own hooks and that server opens the database on boot. E2E_DB_FILE
 * carries the guard that stops this ever pointing at the real sqlite.db.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { E2E_DB_FILE } from './db-path'

// Recreated from scratch so a run never inherits what the last one left.
rmSync(E2E_DB_FILE, { force: true })
mkdirSync(dirname(E2E_DB_FILE), { recursive: true })
process.env.DB_FILE_NAME = E2E_DB_FILE

const { db } = await import('@/db/database')
const { migrate } = await import('drizzle-orm/bun-sqlite/migrator')
const { createUser } = await import('@/lib/create-user')
const { wishlists, wishlistItems } = await import('@/db/schema/wishlists')
const { itunesMediaItem, itunesPriceHistory } =
  await import('@/db/schema/itunes')

migrate(db, { migrationsFolder: './drizzle' })

await createUser({
  email: 'e2e@example.test',
  password: 'e2e-password-123',
  name: 'E2E Tester',
})

const umzug = db
  .insert(wishlists)
  .values({ name: 'Umzug', description: 'Sachen für die neue Wohnung' })
  .returning()
  .get()

db.insert(wishlists)
  .values({ name: 'Geburtstag', description: 'Geschenkideen' })
  .returning()
  .get()

db.insert(wishlistItems)
  .values([
    {
      wishlistId: umzug.id,
      name: 'Kaffeemühle',
      url: 'https://example.test/kaffeemuehle',
      price: 89.9,
      priority: 5,
      isActive: true,
      isPurchased: false,
    },
    {
      wishlistId: umzug.id,
      name: 'Schreibtischlampe',
      url: 'https://example.test/lampe',
      price: 42.5,
      priority: 3,
      isActive: true,
      isPurchased: true,
    },
    {
      wishlistId: umzug.id,
      name: 'Regal',
      url: 'https://example.test/regal',
      price: 120,
      priority: 2,
      isActive: false,
      isPurchased: false,
    },
  ])
  .run()

// One watchlist entry so the iTunes page has something to render.
const media = db
  .insert(itunesMediaItem)
  .values({
    itunesId: 1001,
    itunesIdType: 'track',
    wrapperType: 'track',
    mediaType: 'feature',
    entityType: 'feature-movie',
    name: 'Interstellar',
    artistName: 'Christopher Nolan',
    viewUrl: 'https://example.test/itunes/1001',
    primaryGenreName: 'Sci-Fi',
    country: 'de',
    currency: 'EUR',
    additionalData: JSON.stringify({ trackPrice: 9.99, trackHdPrice: 12.99 }),
    createdAt: new Date(),
  })
  .returning()
  .get()

db.insert(itunesPriceHistory)
  .values({
    mediaItemId: media.id,
    standardPrice: 9.99,
    hdPrice: 12.99,
    currency: 'EUR',
    country: 'de',
    recordedAt: new Date(),
  })
  .run()

console.log('seeded', E2E_DB_FILE)
