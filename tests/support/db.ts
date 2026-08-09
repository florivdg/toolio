import { db } from '@/db/database'
import { wishlistItems, wishlists } from '@/db/schema/wishlists'

/** Remove all wishlist data so each test starts from a known state. */
export function resetWishlists(): void {
  // Items first: the FK to wishlists cascades, but being explicit keeps the
  // helper correct regardless of PRAGMA foreign_keys state.
  db.delete(wishlistItems).run()
  db.delete(wishlists).run()
}

export function seedWishlist(
  overrides: Partial<typeof wishlists.$inferInsert> = {},
) {
  return db
    .insert(wishlists)
    .values({ name: 'Testliste', ...overrides })
    .returning()
    .get()
}

export function seedWishlistItem(
  wishlistId: string,
  overrides: Partial<typeof wishlistItems.$inferInsert> = {},
) {
  return db
    .insert(wishlistItems)
    .values({
      wishlistId,
      name: 'Testartikel',
      url: 'https://example.com/product/1',
      ...overrides,
    })
    .returning()
    .get()
}

/** A UUID that is well-formed but guaranteed absent, for 404 paths. */
export const MISSING_UUID = '00000000-0000-4000-8000-000000000000'
