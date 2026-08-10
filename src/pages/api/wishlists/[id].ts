import type { APIRoute } from 'astro'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/database'
import { wishlists, wishlistItems, wishlistSchema } from '@/db/schema/wishlists'
import { json, notFound, ok } from '@/lib/api/responses'
import { handleApiError, requireWishlist } from '@/lib/api/wishlist-guards'

// Schema for path parameters
const pathParamsSchema = z.object({
  id: z.uuid(),
})

const NOT_FOUND = 'Wunschliste nicht gefunden'

// GET - Get a specific wishlist with its items
export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = pathParamsSchema.parse(params)

    const wishlist = requireWishlist(id)
    if (wishlist.response) return wishlist.response

    const items = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, id))
      .orderBy(wishlistItems.priority, wishlistItems.createdAt)
      .all()

    return ok({ ...wishlist.value, items })
  } catch (error) {
    return handleApiError(error, {
      log: 'Error fetching wishlist',
      message: 'Fehler beim Laden der Wunschliste',
    })
  }
}

// PUT - Update a specific wishlist
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = pathParamsSchema.parse(params)
    const validated = wishlistSchema.parse(await request.json())

    const existing = requireWishlist(id)
    if (existing.response) return existing.response

    const updatedWishlist = db
      .update(wishlists)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(wishlists.id, id))
      .returning()
      .get()

    return ok(updatedWishlist, 'Wunschliste erfolgreich aktualisiert')
  } catch (error) {
    return handleApiError(error, {
      log: 'Error updating wishlist',
      message: 'Fehler beim Aktualisieren der Wunschliste',
    })
  }
}

// DELETE - Delete a specific wishlist
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = pathParamsSchema.parse(params)

    // Deleting straight away avoids a redundant lookup; a missing row simply
    // returns nothing. Items are removed by the cascading foreign key.
    const deletedWishlist = db
      .delete(wishlists)
      .where(eq(wishlists.id, id))
      .returning()
      .get()

    if (!deletedWishlist) return notFound(NOT_FOUND)

    // This route reports the removed id rather than a data payload.
    return json(
      {
        success: true,
        message: 'Wunschliste erfolgreich gelöscht',
        deletedId: id,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error deleting wishlist',
      message: 'Fehler beim Löschen der Wunschliste',
    })
  }
}
