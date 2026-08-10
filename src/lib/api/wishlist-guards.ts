/**
 * Lookup guards and error handling shared by the wishlist item routes.
 *
 * Each route repeated the same three steps: load the wishlist or 404, load the
 * item scoped to that wishlist or 404, then translate a thrown ZodError into a
 * 400 and anything else into a 500.
 */

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/database'
import { wishlistItems, wishlists } from '@/db/schema/wishlists'
import { notFound } from './responses'

/** Path parameters shared by every /wishlists/:wishlistId/items/:itemId route. */
export const itemPathParamsSchema = z.object({
  wishlistId: z.uuid(),
  itemId: z.uuid(),
})

/**
 * A guard either yields a value or the Response that should be returned. Callers
 * check `response` first, which keeps the 404 bodies identical across routes.
 */
type GuardResult<T> =
  { value: T; response?: undefined } | { value?: undefined; response: Response }

export function requireWishlist(
  wishlistId: string,
  message = 'Wunschliste nicht gefunden',
): GuardResult<typeof wishlists.$inferSelect> {
  const wishlist = db
    .select()
    .from(wishlists)
    .where(eq(wishlists.id, wishlistId))
    .get()

  return wishlist ? { value: wishlist } : { response: notFound(message) }
}

/**
 * Loads an item scoped to its wishlist. The wishlist predicate is what stops one
 * list's id being used to reach another list's item, so it is part of the
 * contract rather than an incidental filter.
 */
export function requireWishlistItem(
  wishlistId: string,
  itemId: string,
  message = 'Wunschlistenelement nicht gefunden',
): GuardResult<typeof wishlistItems.$inferSelect> {
  const item = db
    .select()
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.id, itemId),
        eq(wishlistItems.wishlistId, wishlistId),
      ),
    )
    .get()

  return item ? { value: item } : { response: notFound(message) }
}

/** Predicate matching a single wishlist item within its wishlist. */
export function itemScope(wishlistId: string, itemId: string) {
  return and(
    eq(wishlistItems.id, itemId),
    eq(wishlistItems.wishlistId, wishlistId),
  )
}

// Re-exported so the wishlist routes keep importing it from the guard module
// they already use; the implementation is generic and lives with the responses.
export { handleApiError } from './responses'
