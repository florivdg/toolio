import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { wishlists } from '@/db/schema/wishlists'
import { eq } from 'drizzle-orm'
import { GET as listWishlists, POST as createWishlist } from '@/pages/api/wishlists/index'
import {
  DELETE as deleteWishlist,
  GET as getWishlist,
  PUT as putWishlist,
} from '@/pages/api/wishlists/[id]'
import {
  MISSING_UUID,
  resetWishlists,
  seedWishlist,
  seedWishlistItem,
} from '../../support/db'
import { callRoute, readJson } from '../../support/route'

function wishlistById(id: string) {
  return db.select().from(wishlists).where(eq(wishlists.id, id)).get()
}

describe('GET /api/wishlists', () => {
  beforeEach(() => resetWishlists())

  test('returns wishlists with item counts and latest items', async () => {
    const id = seedWishlist({ name: 'Geburtstag' }).id!
    seedWishlistItem(id, { name: 'Buch' })
    seedWishlistItem(id, { name: 'Kamera' })

    const { status, body } = await readJson(
      await callRoute(listWishlists, { url: 'http://localhost/api/wishlists' }),
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Geburtstag')
    expect(body.data[0].itemCount).toBe(2)
    expect(body.data[0].latestItems).toHaveLength(2)
  })

  test('caps latestItems at three', async () => {
    const id = seedWishlist().id!
    for (let i = 0; i < 5; i++) seedWishlistItem(id, { name: `Artikel ${i}` })

    const { body } = await readJson(
      await callRoute(listWishlists, { url: 'http://localhost/api/wishlists' }),
    )

    expect(body.data[0].itemCount).toBe(5)
    expect(body.data[0].latestItems).toHaveLength(3)
  })

  test('reports pagination and hasMore', async () => {
    for (let i = 0; i < 3; i++) seedWishlist({ name: `Liste ${i}` })

    const { body } = await readJson(
      await callRoute(listWishlists, {
        url: 'http://localhost/api/wishlists?limit=2&offset=0',
      }),
    )

    expect(body.data).toHaveLength(2)
    expect(body.pagination).toMatchObject({
      limit: 2,
      offset: 0,
      total: 3,
      hasMore: true,
    })
  })

  test('clears hasMore on the last page', async () => {
    for (let i = 0; i < 3; i++) seedWishlist({ name: `Liste ${i}` })

    const { body } = await readJson(
      await callRoute(listWishlists, {
        url: 'http://localhost/api/wishlists?limit=2&offset=2',
      }),
    )

    expect(body.data).toHaveLength(1)
    expect(body.pagination.hasMore).toBe(false)
  })

  test('400s on an out-of-range limit', async () => {
    const { status, body } = await readJson(
      await callRoute(listWishlists, {
        url: 'http://localhost/api/wishlists?limit=999',
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })

  test('returns an empty list rather than erroring when there is nothing', async () => {
    const { status, body } = await readJson(
      await callRoute(listWishlists, { url: 'http://localhost/api/wishlists' }),
    )

    expect(status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.pagination.total).toBe(0)
  })
})

describe('POST /api/wishlists', () => {
  beforeEach(() => resetWishlists())

  test('creates a wishlist and answers 201', async () => {
    const { status, body } = await readJson(
      await callRoute(createWishlist, {
        body: { name: 'Weihnachten', description: 'Ideen' },
      }),
    )

    expect(status).toBe(201)
    expect(body.message).toBe('Wunschliste erfolgreich erstellt')
    expect(body.data.name).toBe('Weihnachten')
    expect(body.data.itemCount).toBe(0)
    expect(body.data.latestItems).toEqual([])
    expect(wishlistById(body.data.id)).toBeDefined()
  })

  test('400s when the name is missing', async () => {
    const { status, body } = await readJson(
      await callRoute(createWishlist, { body: { description: 'ohne Namen' } }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })
})

describe('/api/wishlists/[id]', () => {
  let id: string

  beforeEach(() => {
    resetWishlists()
    id = seedWishlist({ name: 'Umzug' }).id!
  })

  test('GET returns the wishlist with its items ordered by priority', async () => {
    seedWishlistItem(id, { name: 'Zweitens', priority: 2 })
    seedWishlistItem(id, { name: 'Erstens', priority: 1 })

    const { status, body } = await readJson(
      await callRoute(getWishlist, { params: { id } }),
    )

    expect(status).toBe(200)
    expect(body.data.name).toBe('Umzug')
    expect(body.data.items.map((i: any) => i.name)).toEqual([
      'Erstens',
      'Zweitens',
    ])
  })

  test('GET 404s for a missing wishlist', async () => {
    const { status, body } = await readJson(
      await callRoute(getWishlist, { params: { id: MISSING_UUID } }),
    )
    expect(status).toBe(404)
    expect(body.message).toBe('Wunschliste nicht gefunden')
  })

  test('GET 400s on a malformed id', async () => {
    const { status } = await readJson(
      await callRoute(getWishlist, { params: { id: 'nope' } }),
    )
    expect(status).toBe(400)
  })

  test('PUT updates the wishlist', async () => {
    const { status, body } = await readJson(
      await callRoute(putWishlist, {
        params: { id },
        body: { name: 'Umzug 2026' },
      }),
    )

    expect(status).toBe(200)
    expect(body.message).toBe('Wunschliste erfolgreich aktualisiert')
    expect(wishlistById(id)?.name).toBe('Umzug 2026')
  })

  test('PUT 404s for a missing wishlist', async () => {
    const { status } = await readJson(
      await callRoute(putWishlist, {
        params: { id: MISSING_UUID },
        body: { name: 'x' },
      }),
    )
    expect(status).toBe(404)
  })

  test('DELETE removes the wishlist and cascades to its items', async () => {
    const itemId = seedWishlistItem(id).id!

    const { status, body } = await readJson(
      await callRoute(deleteWishlist, { params: { id } }),
    )

    expect(status).toBe(200)
    expect(body.message).toBe('Wunschliste erfolgreich gelöscht')
    expect(wishlistById(id)).toBeUndefined()
    expect(itemId).toBeDefined()
  })

  test('DELETE 404s for a missing wishlist', async () => {
    const { status } = await readJson(
      await callRoute(deleteWishlist, { params: { id: MISSING_UUID } }),
    )
    expect(status).toBe(404)
  })
})
