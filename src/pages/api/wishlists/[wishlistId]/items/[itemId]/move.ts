import type { APIRoute } from 'astro'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { badRequest, ok, serverError } from '@/lib/api/responses'
import {
  handleApiError,
  itemPathParamsSchema,
  requireWishlist,
  requireWishlistItem,
} from '@/lib/api/wishlist-guards'

// Schema for request body
const moveItemSchema = z.object({
  targetWishlistId: z.uuid(),
})

const MOVE_FAILED = 'Fehler beim Verschieben des Artikels'

// PATCH - Move item to another wishlist
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)
    const { targetWishlistId } = moveItemSchema.parse(await request.json())

    const source = requireWishlist(
      wishlistId,
      'Quell-Wunschliste nicht gefunden',
    )
    if (source.response) return source.response

    const target = requireWishlist(
      targetWishlistId,
      'Ziel-Wunschliste nicht gefunden',
    )
    if (target.response) return target.response

    const item = requireWishlistItem(
      wishlistId,
      itemId,
      'Artikel nicht gefunden',
    )
    if (item.response) return item.response

    if (targetWishlistId === wishlistId) {
      return badRequest('Artikel ist bereits in der Ziel-Wunschliste')
    }

    const updatedItem = db
      .update(wishlistItems)
      .set({ wishlistId: targetWishlistId, updatedAt: new Date() })
      .where(eq(wishlistItems.id, itemId))
      .returning()
      .get()

    if (!updatedItem) return serverError(MOVE_FAILED)

    return ok(updatedItem, 'Artikel erfolgreich verschoben')
  } catch (error) {
    // This route never returned the underlying error text to the client.
    return handleApiError(error, {
      log: 'Error moving wishlist item',
      message: MOVE_FAILED,
      includeErrorDetail: false,
    })
  }
}
