import { describe, expect, test } from 'bun:test'
import { withItemDefaults } from '@/lib/wishlists/queries'
import type { WishlistWithItems } from '@/lib/wishlists/queries'

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
