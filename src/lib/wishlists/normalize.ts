import type { Wishlist, WishlistItem } from '@/db/schema/wishlists'

/** A wishlist as the list endpoints return it, with its item summary. */
export interface WishlistWithItems extends Wishlist {
  itemCount?: number
  latestItems?: Partial<WishlistItem>[]
}

/**
 * Fill in the item summary, or report the wishlist as unusable.
 *
 * @returns The normalised wishlist, or undefined when it carries no id
 */
export function normalizeWishlist(
  wishlist: WishlistWithItems | undefined,
): WishlistWithItems | undefined {
  if (!wishlist?.id) return undefined

  return {
    ...wishlist,
    itemCount: wishlist.itemCount ?? 0,
    latestItems: wishlist.latestItems ?? [],
  }
}

/** Drops anything unusable, so a bad row costs one card rather than the list. */
export function normalizeWishlists(
  wishlists: (WishlistWithItems | undefined)[],
): WishlistWithItems[] {
  return wishlists
    .map(normalizeWishlist)
    .filter((wishlist): wishlist is WishlistWithItems => wishlist !== undefined)
}

/**
 * The create endpoint already returns itemCount and latestItems, but a wishlist
 * rendered straight from that result must not depend on it.
 *
 * Unlike the list path this throws, because a create response with no id means
 * the caller has nothing to render or navigate to.
 *
 * Kept out of queries.ts so it can be imported and tested without pulling in the
 * Pinia Colada composables that module is otherwise made of.
 */
export function withItemDefaults(
  wishlist: WishlistWithItems,
): WishlistWithItems {
  const normalized = normalizeWishlist(wishlist)

  if (!normalized) {
    throw new Error('API-Antwort enthält keine Wishlist-ID')
  }

  return normalized
}
