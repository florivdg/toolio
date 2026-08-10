import { describe, expect, test } from 'bun:test'
import {
  normalizeWishlist,
  normalizeWishlists,
  withItemDefaults,
} from '@/lib/wishlists/normalize'
import type { WishlistWithItems } from '@/lib/wishlists/normalize'

/**
 * The create endpoint is trusted to return itemCount and latestItems, but the
 * UI renders straight from this result, so the defaults are load-bearing.
 */
describe('withItemDefaults', () => {
  const base = { id: 'w1', name: 'Liste' } as WishlistWithItems

  test('fills in a zero item count and an empty item list', () => {
    const result = withItemDefaults({ ...base })

    expect(result.itemCount).toBe(0)
    expect(result.latestItems).toEqual([])
    expect(result.name).toBe('Liste')
  })

  test('keeps values the server already supplied', () => {
    const result = withItemDefaults({
      ...base,
      itemCount: 3,
      latestItems: [{ id: 'i1', name: 'Artikel' }],
    })

    expect(result.itemCount).toBe(3)
    expect(result.latestItems).toHaveLength(1)
  })

  test('preserves a genuine zero rather than treating it as missing', () => {
    expect(withItemDefaults({ ...base, itemCount: 0 }).itemCount).toBe(0)
  })

  test('throws when the response carries no id', () => {
    expect(() => withItemDefaults({ ...base, id: undefined } as never)).toThrow(
      'API-Antwort enthält keine Wishlist-ID',
    )
  })

  test('throws when the response is absent entirely', () => {
    expect(() => withItemDefaults(undefined as never)).toThrow(
      'API-Antwort enthält keine Wishlist-ID',
    )
  })

  test('does not mutate its input', () => {
    const input = { ...base }
    withItemDefaults(input)

    expect(input).not.toHaveProperty('itemCount')
  })
})

/**
 * The list path is deliberately more forgiving than withItemDefaults: one bad
 * row should cost that card, not the whole overview.
 */
describe('normalizeWishlist', () => {
  test('fills in the item summary', () => {
    const result = normalizeWishlist({ id: 'w1', name: 'Liste' } as never)

    expect(result).toMatchObject({ itemCount: 0, latestItems: [] })
  })

  test('reports a row with no id as unusable instead of throwing', () => {
    expect(normalizeWishlist({ name: 'Liste' } as never)).toBeUndefined()
    expect(normalizeWishlist(undefined)).toBeUndefined()
  })
})

describe('normalizeWishlists', () => {
  test('normalises every usable row', () => {
    const result = normalizeWishlists([
      { id: 'w1', name: 'Eins' } as never,
      { id: 'w2', name: 'Zwei', itemCount: 4 } as never,
    ])

    expect(result).toHaveLength(2)
    expect(result[0]!.itemCount).toBe(0)
    expect(result[1]!.itemCount).toBe(4)
  })

  test('drops the unusable ones rather than rendering holes', () => {
    const result = normalizeWishlists([
      { id: 'w1', name: 'Eins' } as never,
      { name: 'Ohne ID' } as never,
      undefined,
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('w1')
  })

  test('returns an empty list for an empty page', () => {
    expect(normalizeWishlists([])).toEqual([])
  })
})
