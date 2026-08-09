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

// Schema for updating active status
const activeStatusSchema = z.object({
  isActive: z.boolean(),
})

// PATCH - Update active status of a wishlist item
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    const { isActive } = activeStatusSchema.parse(await request.json())

    const existing = requireWishlistItem(wishlistId, itemId)
    if (existing.response) return existing.response

    const updatedItem = db
      .update(wishlistItems)
      .set({ isActive, updatedAt: new Date() })
      .where(itemScope(wishlistId, itemId))
      .returning()
      .get()

    const statusMessage = isActive
      ? 'Als aktiv markiert'
      : 'Als inaktiv markiert'

    return ok(updatedItem, `Wunschlistenelement erfolgreich ${statusMessage}`)
  } catch (error) {
    return handleApiError(error, {
      log: 'Error updating active status',
      message: 'Fehler beim Aktualisieren des Aktivitätsstatus',
    })
  }
}
