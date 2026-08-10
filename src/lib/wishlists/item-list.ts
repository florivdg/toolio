import type { WishlistItem } from '@/db/schema/wishlists'

/**
 * Derivations behind the wishlist item table: which items the current filter
 * shows, what they cost, and the confirmation wording.
 *
 * Kept out of the view so each rule can be checked on plain arrays rather than
 * through a mounted component.
 */

/** The filters the toolbar offers. */
type ItemFilter = 'all' | 'active' | 'purchased' | 'unpurchased'

/** Which items each filter keeps; `all` has no predicate. */
const FILTER_PREDICATES: Record<
  Exclude<ItemFilter, 'all'>,
  (item: WishlistItem) => boolean
> = {
  active: (item) => Boolean(item.isActive) && !item.isPurchased,
  purchased: (item) => Boolean(item.isPurchased),
  unpurchased: (item) => !item.isPurchased,
}

/**
 * Apply the current filter.
 *
 * An unknown filter shows everything rather than nothing: a stale value in the
 * toolbar should not make the list look empty.
 */
export function filterItems(
  items: WishlistItem[],
  filter: string,
): WishlistItem[] {
  const predicate = FILTER_PREDICATES[filter as Exclude<ItemFilter, 'all'>]

  return predicate ? items.filter(predicate) : items
}

/** Total of every item's price; items without a price count as zero. */
export function sumPrices(items: WishlistItem[]): number {
  return items.reduce((sum, item) => sum + (item.price || 0), 0)
}

/** Total of the items still to buy — active and not yet purchased. */
export function sumActivePrices(items: WishlistItem[]): number {
  return sumPrices(items.filter(FILTER_PREDICATES.active))
}

/**
 * A blank item for the edit modal to bind to while nothing is being edited.
 *
 * The modal requires an item prop, so it needs something rather than null.
 */
export const EMPTY_WISHLIST_ITEM: WishlistItem = {
  id: '',
  wishlistId: '',
  name: '',
  description: '',
  price: 0,
  url: '',
  imageUrl: '',
  isActive: true,
  isPurchased: false,
  priority: 3,
  notes: '',
  createdAt: '',
  updatedAt: '',
} as unknown as WishlistItem

export function deleteItemDescription(name: string | undefined): string {
  return `Sind Sie sicher, dass Sie den Artikel "${name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`
}

export function deleteWishlistDescription(name: string | undefined): string {
  return `Sind Sie sicher, dass Sie die Wishlist "${name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden und alle Artikel in dieser Wishlist werden ebenfalls gelöscht.`
}
