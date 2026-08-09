import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { wishlistItems, wishlistItemSchema } from '@/db/schema/wishlists'
import { badRequest, json, ok } from '@/lib/api/responses'
import {
  handleApiError,
  itemPathParamsSchema,
  itemScope,
  requireWishlist,
  requireWishlistItem,
} from '@/lib/api/wishlist-guards'

// Schema for partial updates - all fields optional except id, wishlistId, createdAt
const wishlistItemUpdateSchema = wishlistItemSchema.partial().omit({
  id: true,
  wishlistId: true,
  createdAt: true,
})

// GET - Get a specific wishlist item
export const GET: APIRoute = async ({ params }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    const item = requireWishlistItem(wishlistId, itemId)
    if (item.response) return item.response

    return ok(item.value)
  } catch (error) {
    return handleApiError(error, {
      log: 'Error fetching wishlist item',
      message: 'Fehler beim Laden des Wunschlistenelements',
    })
  }
}

// PUT - Update a specific wishlist item
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    const validated = wishlistItemUpdateSchema.parse(await request.json())

    // Undefined values are dropped below, so a body of only undefined fields
    // would issue an update that changes nothing but updatedAt.
    const providedFields = Object.keys(validated).filter(
      (key) => validated[key as keyof typeof validated] !== undefined,
    )

    if (providedFields.length === 0) {
      return badRequest(
        'Mindestens ein Feld muss für die Aktualisierung angegeben werden',
      )
    }

    const existing = requireWishlistItem(wishlistId, itemId)
    if (existing.response) return existing.response

    // Drop undefined so absent fields are left alone, but keep null so a field
    // can be cleared explicitly.
    const cleanUpdateData = Object.fromEntries(
      Object.entries({ ...validated, updatedAt: new Date() }).filter(
        ([, value]) => value !== undefined,
      ),
    )

    const updatedItem = db
      .update(wishlistItems)
      .set(cleanUpdateData)
      .where(itemScope(wishlistId, itemId))
      .returning()
      .get()

    return ok(updatedItem, 'Wunschlistenelement erfolgreich aktualisiert')
  } catch (error) {
    return handleApiError(error, {
      log: 'Error updating wishlist item',
      message: 'Fehler beim Aktualisieren des Wunschlistenelements',
    })
  }
}

// DELETE - Delete a specific wishlist item
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    // The delete is scoped to the wishlist, so a missing row and an out-of-scope
    // row are indistinguishable here; both answer 404.
    const deletedItem = db
      .delete(wishlistItems)
      .where(itemScope(wishlistId, itemId))
      .returning()
      .get()

    if (!deletedItem) {
      return json(
        { success: false, message: 'Wunschlistenelement nicht gefunden' },
        404,
      )
    }

    // This route reports the removed id rather than a data payload.
    return json(
      {
        success: true,
        message: 'Wunschlistenelement erfolgreich gelöscht',
        deletedId: itemId,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error deleting wishlist item',
      message: 'Fehler beim Löschen des Wunschlistenelements',
    })
  }
}
