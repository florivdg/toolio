import { beforeEach, describe, expect, test } from 'bun:test'
import {
  GET as listItems,
  POST as createItem,
} from '@/pages/api/wishlists/[wishlistId]/items/index'
import {
  MISSING_UUID,
  resetWishlists,
  seedWishlist,
  seedWishlistItem,
} from '../../support/db'
import { callRoute, readJson } from '../../support/route'

describe('GET /api/wishlists/:id/items', () => {
  let wishlistId: string

  beforeEach(() => {
    resetWishlists()
    wishlistId = seedWishlist().id!
  })

  function list(query = '') {
    return callRoute(listItems, {
      params: { wishlistId },
      url: `http://localhost/api/wishlists/${wishlistId}/items${query}`,
    })
  }

  test('returns the items with pagination', async () => {
    seedWishlistItem(wishlistId, { name: 'A' })
    seedWishlistItem(wishlistId, { name: 'B' })

    const { status, body } = await readJson(await list())

    expect(status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.pagination).toMatchObject({ total: 2, hasMore: false })
  })

  test('orders by priority descending', async () => {
    seedWishlistItem(wishlistId, { name: 'Niedrig', priority: 1 })
    seedWishlistItem(wishlistId, { name: 'Hoch', priority: 9 })

    const { body } = await readJson(await list())

    expect(body.data.map((i: any) => i.name)).toEqual(['Hoch', 'Niedrig'])
  })

  test('filters by purchased state', async () => {
    seedWishlistItem(wishlistId, { name: 'Gekauft', isPurchased: true })
    seedWishlistItem(wishlistId, { name: 'Offen', isPurchased: false })

    const { body } = await readJson(await list('?purchased=true'))

    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Gekauft')
  })

  test('filters by active state', async () => {
    seedWishlistItem(wishlistId, { name: 'Aktiv', isActive: true })
    seedWishlistItem(wishlistId, { name: 'Inaktiv', isActive: false })

    const { body } = await readJson(await list('?active=true'))

    expect(body.data.map((i: any) => i.name)).toEqual(['Aktiv'])
  })

  test('filters by purchased=false rather than inverting it', async () => {
    // Regression: z.coerce.boolean() is Boolean(value), so 'false' parsed as
    // true and this query returned exactly the wrong rows.
    seedWishlistItem(wishlistId, { name: 'Gekauft', isPurchased: true })
    seedWishlistItem(wishlistId, { name: 'Offen', isPurchased: false })

    const { body } = await readJson(await list('?purchased=false'))

    expect(body.data.map((i: any) => i.name)).toEqual(['Offen'])
  })

  test('filters by active=false rather than inverting it', async () => {
    seedWishlistItem(wishlistId, { name: 'Aktiv', isActive: true })
    seedWishlistItem(wishlistId, { name: 'Inaktiv', isActive: false })

    const { body } = await readJson(await list('?active=false'))

    expect(body.data.map((i: any) => i.name)).toEqual(['Inaktiv'])
  })

  test('400s on a non-boolean filter value', async () => {
    const { status } = await readJson(await list('?purchased=vielleicht'))
    expect(status).toBe(400)
  })

  test('counts only the filtered rows', async () => {
    seedWishlistItem(wishlistId, { isPurchased: true })
    seedWishlistItem(wishlistId, { isPurchased: false })
    seedWishlistItem(wishlistId, { isPurchased: false })

    const { body } = await readJson(await list('?purchased=false&limit=1'))

    expect(body.pagination.total).toBe(2)
    expect(body.pagination.hasMore).toBe(true)
  })

  test('does not leak items from another wishlist', async () => {
    const otherId = seedWishlist({ name: 'Andere' }).id!
    seedWishlistItem(otherId, { name: 'Fremd' })
    seedWishlistItem(wishlistId, { name: 'Eigen' })

    const { body } = await readJson(await list())

    expect(body.data.map((i: any) => i.name)).toEqual(['Eigen'])
  })

  test('404s for a missing wishlist', async () => {
    const { status, body } = await readJson(
      await callRoute(listItems, {
        params: { wishlistId: MISSING_UUID },
        url: 'http://localhost/api/wishlists/x/items',
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Wunschliste nicht gefunden')
  })

  test('400s on an out-of-range limit', async () => {
    const { status, body } = await readJson(await list('?limit=500'))
    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })
})

describe('POST /api/wishlists/:id/items', () => {
  let wishlistId: string

  beforeEach(() => {
    resetWishlists()
    wishlistId = seedWishlist().id!
  })

  test('creates an item and answers 201', async () => {
    const { status, body } = await readJson(
      await callRoute(createItem, {
        params: { wishlistId },
        body: { name: 'Rucksack', url: 'https://example.com/rucksack' },
      }),
    )

    expect(status).toBe(201)
    expect(body.message).toBe('Wunschlistenelement erfolgreich erstellt')
    expect(body.data.name).toBe('Rucksack')
    expect(body.data.wishlistId).toBe(wishlistId)
  })

  test('takes wishlistId from the path, not the body', async () => {
    const otherId = seedWishlist({ name: 'Andere' }).id!

    const { body } = await readJson(
      await callRoute(createItem, {
        params: { wishlistId },
        body: {
          name: 'Rucksack',
          url: 'https://example.com/x',
          wishlistId: otherId,
        },
      }),
    )

    expect(body.data.wishlistId).toBe(wishlistId)
  })

  test('404s for a missing wishlist', async () => {
    const { status } = await readJson(
      await callRoute(createItem, {
        params: { wishlistId: MISSING_UUID },
        body: { name: 'x', url: 'https://example.com/x' },
      }),
    )
    expect(status).toBe(404)
  })

  test('400s when required fields are missing', async () => {
    const { status, body } = await readJson(
      await callRoute(createItem, {
        params: { wishlistId },
        body: { name: 'Ohne URL' },
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })
})
