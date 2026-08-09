/**
 * Factory for the boolean-flag item routes.
 *
 * active.ts and purchase.ts differ only in which column they set and which
 * German wording they report, so they are generated from one implementation
 * rather than kept as two near-identical files.
 */

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlistItems } from '@/db/schema/wishlists'
import { ok } from './responses'
import {
  handleApiError,
  itemPathParamsSchema,
  itemScope,
  requireWishlist,
  requireWishlistItem,
} from './wishlist-guards'

type BooleanColumn = 'isActive' | 'isPurchased'

interface StatusRouteConfig {
  /** Body field and item column to set; they share a name. */
  field: BooleanColumn
  /** Wording appended to 'Wunschlistenelement erfolgreich '. */
  labelFor: (value: boolean) => string
  /** English prefix for the server log. */
  log: string
  /** German message for an unexpected failure. */
  errorMessage: string
}

export function createItemStatusRoute({
  field,
  labelFor,
  log,
  errorMessage,
}: StatusRouteConfig): APIRoute {
  const bodySchema = z.object({ [field]: z.boolean() })

  return async ({ params, request }) => {
    try {
      const { wishlistId, itemId } = itemPathParamsSchema.parse(params)

      const wishlist = requireWishlist(wishlistId)
      if (wishlist.response) return wishlist.response

      const parsed = bodySchema.parse(await request.json())
      const value = parsed[field] as boolean

      const existing = requireWishlistItem(wishlistId, itemId)
      if (existing.response) return existing.response

      const updatedItem = db
        .update(wishlistItems)
        .set({ [field]: value, updatedAt: new Date() })
        .where(itemScope(wishlistId, itemId))
        .returning()
        .get()

      return ok(
        updatedItem,
        `Wunschlistenelement erfolgreich ${labelFor(value)}`,
      )
    } catch (error) {
      return handleApiError(error, { log, message: errorMessage })
    }
  }
}
