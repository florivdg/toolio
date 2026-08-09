import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { ok } from '@/lib/api/responses'
import {
  handleApiError,
  itemPathParamsSchema,
  itemScope,
  requireWishlist,
  requireWishlistItem,
} from '@/lib/api/wishlist-guards'

// Schema for updating purchase status
const purchaseStatusSchema = z.object({
  isPurchased: z.boolean(),
})

// PATCH - Update purchase status of a wishlist item
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    const { isPurchased } = purchaseStatusSchema.parse(await request.json())

    const existing = requireWishlistItem(wishlistId, itemId)
    if (existing.response) return existing.response

    const updatedItem = db
      .update(wishlistItems)
      .set({ isPurchased, updatedAt: new Date() })
      .where(itemScope(wishlistId, itemId))
      .returning()
      .get()

    const statusMessage = isPurchased
      ? 'Als gekauft markiert'
      : 'Als nicht gekauft markiert'

    return ok(updatedItem, `Wunschlistenelement erfolgreich ${statusMessage}`)
  } catch (error) {
    return handleApiError(error, {
      log: 'Error updating purchase status',
      message: 'Fehler beim Aktualisieren des Kaufstatus',
    })
  }
}
