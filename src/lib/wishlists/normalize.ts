import type { Wishlist, WishlistItem } from '@/db/schema/wishlists'

/** A wishlist as the list endpoints return it, with its item summary. */
export interface WishlistWithItems extends Wishlist {
  itemCount?: number
  latestItems?: Partial<WishlistItem>[]
}

/**
 * The create endpoint already returns itemCount and latestItems, but a wishlist
 * rendered straight from that result must not depend on it.
 *
 * Kept out of queries.ts so it can be imported and tested without pulling in the
 * Pinia Colada composables that module is otherwise made of.
 */
export function withItemDefaults(
  wishlist: WishlistWithItems,
): WishlistWithItems {
  if (!wishlist?.id) {
    throw new Error('API-Antwort enthält keine Wishlist-ID')
  }

  return {
    ...wishlist,
    itemCount: wishlist.itemCount ?? 0,
    latestItems: wishlist.latestItems ?? [],
  }
}
