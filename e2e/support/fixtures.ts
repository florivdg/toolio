/**
 * Restores the wishlist and iTunes fixtures in the isolated e2e database.
 *
 * Run as a child process before each test, so a test that creates or deletes
 * data cannot change what the next one sees. Auth tables are left alone: the
 * signed-in session has to survive the reset.
 *
 * The static import below is also what makes this file a module, which
 * top-level `await` requires.
 */
import { E2E_DB_FILE } from './db-path'

process.env.DB_FILE_NAME = E2E_DB_FILE

const { db } = await import('@/db/database')
const { wishlists, wishlistItems } = await import('@/db/schema/wishlists')
const { itunesMediaItem, itunesPriceHistory } =
  await import('@/db/schema/itunes')

db.delete(wishlistItems).run()
db.delete(wishlists).run()
db.delete(itunesPriceHistory).run()
db.delete(itunesMediaItem).run()

const umzug = db
  .insert(wishlists)
  .values({ name: 'Umzug', description: 'Sachen für die neue Wohnung' })
  .returning()
  .get()

db.insert(wishlists)
  .values({ name: 'Geburtstag', description: 'Geschenkideen' })
  .run()

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
