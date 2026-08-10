import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { eq } from 'drizzle-orm'
import { PATCH as move } from '@/pages/api/wishlists/[wishlistId]/items/[itemId]/move'
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

describe('PATCH move', () => {
  let sourceId: string
  let targetId: string
  let itemId: string

  beforeEach(() => {
    resetWishlists()
    sourceId = seedWishlist({ name: 'Quelle' }).id!
    targetId = seedWishlist({ name: 'Ziel' }).id!
    itemId = seedWishlistItem(sourceId).id!
  })

  test('moves the item to the target wishlist', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: sourceId, itemId },
        body: { targetWishlistId: targetId },
      }),
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Artikel erfolgreich verschoben')
    expect(itemById(itemId)?.wishlistId).toBe(targetId)
  })

  test('404s when the source wishlist is missing', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: MISSING_UUID, itemId },
        body: { targetWishlistId: targetId },
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Quell-Wunschliste nicht gefunden')
  })

  test('404s when the target wishlist is missing', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: sourceId, itemId },
        body: { targetWishlistId: MISSING_UUID },
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Ziel-Wunschliste nicht gefunden')
    expect(itemById(itemId)?.wishlistId).toBe(sourceId)
  })

  test('404s when the item is missing', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: sourceId, itemId: MISSING_UUID },
        body: { targetWishlistId: targetId },
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Artikel nicht gefunden')
  })

  test('400s when source and target are the same list', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: sourceId, itemId },
        body: { targetWishlistId: sourceId },
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Artikel ist bereits in der Ziel-Wunschliste')
    expect(itemById(itemId)?.wishlistId).toBe(sourceId)
  })

  test('400s on an invalid target id', async () => {
    const { status, body } = await readJson(
      await callRoute(move, {
        params: { wishlistId: sourceId, itemId },
        body: { targetWishlistId: 'nope' },
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })
})
