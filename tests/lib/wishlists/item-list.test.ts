import { describe, expect, test } from 'bun:test'
import {
  deleteItemDescription,
  deleteWishlistDescription,
  EMPTY_WISHLIST_ITEM,
  filterItems,
  sumActivePrices,
  sumPrices,
} from '@/lib/wishlists/item-list'
import type { WishlistItem } from '@/db/schema/wishlists'

/**
 * These decide what the item table shows and what it totals, so a wrong
 * predicate either hides items the user owns or misreports what they cost.
 */

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'i1',
    wishlistId: 'w1',
    name: 'Artikel',
    url: 'https://example.com/p/1',
    isActive: true,
    isPurchased: false,
    price: 10,
    ...overrides,
  } as WishlistItem
}

const items = [
  item({ id: 'a', price: 10 }),
  item({ id: 'b', price: 5, isPurchased: true }),
  item({ id: 'c', price: 2, isActive: false }),
  item({ id: 'd', price: null }),
]

describe('filterItems', () => {
  test('shows everything for "all"', () => {
    expect(filterItems(items, 'all')).toHaveLength(4)
  })

  test('"active" excludes inactive and purchased items', () => {
    expect(filterItems(items, 'active').map((i) => i.id)).toEqual(['a', 'd'])
  })

  test('"purchased" keeps only purchased items', () => {
    expect(filterItems(items, 'purchased').map((i) => i.id)).toEqual(['b'])
  })

  test('"unpurchased" keeps inactive items too', () => {
    expect(filterItems(items, 'unpurchased').map((i) => i.id)).toEqual([
      'a',
      'c',
      'd',
    ])
  })

  test('an unknown filter shows everything rather than nothing', () => {
    expect(filterItems(items, 'quatsch')).toHaveLength(4)
  })

  test('does not mutate the input', () => {
    const input = [...items]
    filterItems(input, 'purchased')

    expect(input).toHaveLength(4)
  })

  test('handles an empty list', () => {
    expect(filterItems([], 'active')).toEqual([])
  })
})

describe('sumPrices', () => {
  test('adds every price, counting a missing one as zero', () => {
    expect(sumPrices(items)).toBe(17)
  })

  test('is zero for an empty list', () => {
    expect(sumPrices([])).toBe(0)
  })
})

describe('sumActivePrices', () => {
  test('counts only what is still to buy', () => {
    // 'a' (10) plus 'd' (no price); 'b' is purchased and 'c' is inactive.
    expect(sumActivePrices(items)).toBe(10)
  })

  test('is zero when everything is purchased', () => {
    expect(sumActivePrices([item({ isPurchased: true })])).toBe(0)
  })
})

describe('EMPTY_WISHLIST_ITEM', () => {
  test('is blank but structurally complete for the edit modal', () => {
    expect(EMPTY_WISHLIST_ITEM.id).toBe('')
    expect(EMPTY_WISHLIST_ITEM.name).toBe('')
    expect(EMPTY_WISHLIST_ITEM.isPurchased).toBe(false)
  })
})

describe('confirmation wording', () => {
  test('names the item being deleted', () => {
    expect(deleteItemDescription('Kaffeemühle')).toContain('"Kaffeemühle"')
    expect(deleteItemDescription('Kaffeemühle')).toContain(
      'nicht rückgängig gemacht werden',
    )
  })

  test('warns that deleting a wishlist takes its items too', () => {
    const text = deleteWishlistDescription('Umzug')

    expect(text).toContain('"Umzug"')
    expect(text).toContain('alle Artikel')
  })
})
