import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { eq } from 'drizzle-orm'
import { PATCH as patchActive } from '@/pages/api/wishlists/[wishlistId]/items/[itemId]/active'
import { PATCH as patchPurchase } from '@/pages/api/wishlists/[wishlistId]/items/[itemId]/purchase'
import {
  MISSING_UUID,
  resetWishlists,
  seedWishlist,
  seedWishlistItem,
} from '../../support/db'
import { callRoute, readJson } from '../../support/route'

/**
 * active.ts and purchase.ts are near-identical today and are the primary target
 * of the shared-helper extraction, so these tests pin the observable contract:
 * status codes, the German messages, and the persisted row.
 */

function itemById(id: string) {
  return db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get()
}

describe.each([
  {
    name: 'active',
    route: patchActive,
    field: 'isActive' as const,
    validBody: { isActive: false },
    okMessage: 'Wunschlistenelement erfolgreich Als inaktiv markiert',
    errorMessage: 'Fehler beim Aktualisieren des Aktivitätsstatus',
  },
  {
    name: 'purchase',
    route: patchPurchase,
    field: 'isPurchased' as const,
    validBody: { isPurchased: true },
    okMessage: 'Wunschlistenelement erfolgreich Als gekauft markiert',
    errorMessage: 'Fehler beim Aktualisieren des Kaufstatus',
  },
])('PATCH $name', ({ route, field, validBody, okMessage }) => {
  let wishlistId: string
  let itemId: string

  beforeEach(() => {
    resetWishlists()
    wishlistId = seedWishlist().id!
    itemId = seedWishlistItem(wishlistId).id!
  })

  test('updates the flag and returns the updated item', async () => {
    const { status, body, contentType } = await readJson(
      await callRoute(route, {
        params: { wishlistId, itemId },
        body: validBody,
      }),
    )

    expect(status).toBe(200)
    expect(contentType).toBe('application/json')
    expect(body.success).toBe(true)
    expect(body.message).toBe(okMessage)
    expect(body.data[field]).toBe(validBody[field as keyof typeof validBody])

    // The response is not enough on its own; confirm it actually persisted.
    expect(itemById(itemId)?.[field]).toBe(
      validBody[field as keyof typeof validBody] as never,
    )
  })

  test('stamps updatedAt', async () => {
    expect(itemById(itemId)?.updatedAt).toBeNull()

    await callRoute(route, { params: { wishlistId, itemId }, body: validBody })

    expect(itemById(itemId)?.updatedAt).toBeInstanceOf(Date)
  })

  test('404s when the wishlist does not exist', async () => {
    const { status, body } = await readJson(
      await callRoute(route, {
        params: { wishlistId: MISSING_UUID, itemId },
        body: validBody,
      }),
    )

    expect(status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Wunschliste nicht gefunden')
  })

  test('404s when the item does not exist', async () => {
    const { status, body } = await readJson(
      await callRoute(route, {
        params: { wishlistId, itemId: MISSING_UUID },
        body: validBody,
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Wunschlistenelement nicht gefunden')
  })

  test('404s when the item belongs to a different wishlist', async () => {
    const otherWishlistId = seedWishlist({ name: 'Andere Liste' }).id!

    const { status } = await readJson(
      await callRoute(route, {
        params: { wishlistId: otherWishlistId, itemId },
        body: validBody,
      }),
    )

    // Scoping the lookup by wishlist is a real access-control property, not an
    // incidental detail of the current query.
    expect(status).toBe(404)
  })

  test('400s on a malformed path parameter', async () => {
    const { status, body } = await readJson(
      await callRoute(route, {
        params: { wishlistId: 'not-a-uuid', itemId },
        body: validBody,
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
    expect(Array.isArray(body.errors)).toBe(true)
  })

  test('400s when the body has the wrong shape', async () => {
    const { status, body } = await readJson(
      await callRoute(route, {
        params: { wishlistId, itemId },
        body: { [field]: 'yes' },
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })

  test('leaves the row untouched when validation fails', async () => {
    const before = itemById(itemId)

    await callRoute(route, {
      params: { wishlistId, itemId },
      body: { [field]: 'yes' },
    })

    expect(itemById(itemId)).toEqual(before!)
  })
})
