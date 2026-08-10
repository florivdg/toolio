import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { eq } from 'drizzle-orm'
import {
  DELETE as deleteItem,
  GET as getItem,
  PUT as putItem,
} from '@/pages/api/wishlists/[wishlistId]/items/[itemId]'
import {
  MISSING_UUID,
  resetWishlists,
  seedWishlist,
  seedWishlistItem,
} from '../../support/db'
import { callRoute, readJson } from '../../support/route'

function itemById(id: string) {
  return db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get()
}

describe('wishlist item CRUD', () => {
  let wishlistId: string
  let itemId: string

  beforeEach(() => {
    resetWishlists()
    wishlistId = seedWishlist().id!
    itemId = seedWishlistItem(wishlistId, {
      name: 'Kaffeemühle',
      price: 89.9,
    }).id!
  })

  describe('GET', () => {
    test('returns the item', async () => {
      const { status, body } = await readJson(
        await callRoute(getItem, { params: { wishlistId, itemId } }),
      )

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Kaffeemühle')
      expect(body.data.price).toBe(89.9)
    })

    test('404s for a missing wishlist', async () => {
      const { status, body } = await readJson(
        await callRoute(getItem, {
          params: { wishlistId: MISSING_UUID, itemId },
        }),
      )
      expect(status).toBe(404)
      expect(body.message).toBe('Wunschliste nicht gefunden')
    })

    test('404s for a missing item', async () => {
      const { status, body } = await readJson(
        await callRoute(getItem, {
          params: { wishlistId, itemId: MISSING_UUID },
        }),
      )
      expect(status).toBe(404)
      expect(body.message).toBe('Wunschlistenelement nicht gefunden')
    })

    test('400s on a malformed id', async () => {
      const { status, body } = await readJson(
        await callRoute(getItem, { params: { wishlistId, itemId: 'x' } }),
      )
      expect(status).toBe(400)
      expect(body.message).toBe('Ungültige Anfrageparameter')
    })
  })

  describe('PUT', () => {
    test('applies a partial update and leaves other fields intact', async () => {
      const { status, body } = await readJson(
        await callRoute(putItem, {
          params: { wishlistId, itemId },
          body: { price: 79.5 },
        }),
      )

      expect(status).toBe(200)
      expect(body.message).toBe('Wunschlistenelement erfolgreich aktualisiert')

      const row = itemById(itemId)
      expect(row?.price).toBe(79.5)
      expect(row?.name).toBe('Kaffeemühle')
    })

    test('404s for a missing item', async () => {
      const { status } = await readJson(
        await callRoute(putItem, {
          params: { wishlistId, itemId: MISSING_UUID },
          body: { price: 1 },
        }),
      )
      expect(status).toBe(404)
    })

    test('400s on a wrongly typed field', async () => {
      const { status, body } = await readJson(
        await callRoute(putItem, {
          params: { wishlistId, itemId },
          body: { price: 'teuer' },
        }),
      )

      expect(status).toBe(400)
      expect(body.message).toBe('Ungültige Anfrageparameter')
      expect(itemById(itemId)?.price).toBe(89.9)
    })
  })

  describe('DELETE', () => {
    test('removes the item', async () => {
      const { status, body } = await readJson(
        await callRoute(deleteItem, { params: { wishlistId, itemId } }),
      )

      expect(status).toBe(200)
      expect(body.message).toBe('Wunschlistenelement erfolgreich gelöscht')
      expect(itemById(itemId)).toBeUndefined()
    })

    test('404s for a missing item and deletes nothing', async () => {
      const { status } = await readJson(
        await callRoute(deleteItem, {
          params: { wishlistId, itemId: MISSING_UUID },
        }),
      )

      expect(status).toBe(404)
      expect(itemById(itemId)).toBeDefined()
    })

    test('does not delete an item scoped to another wishlist', async () => {
      const otherId = seedWishlist({ name: 'Andere' }).id!

      const { status } = await readJson(
        await callRoute(deleteItem, {
          params: { wishlistId: otherId, itemId },
        }),
      )

      expect(status).toBe(404)
      expect(itemById(itemId)).toBeDefined()
    })
  })
})
