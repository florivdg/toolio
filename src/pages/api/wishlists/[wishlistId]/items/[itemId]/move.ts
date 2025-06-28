import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlists, wishlistItems } from '@/db/schema/wishlists'
import { eq, and } from 'drizzle-orm'

// Schema for path parameters
const pathParamsSchema = z.object({
  wishlistId: z.string().uuid(),
  itemId: z.string().uuid(),
})

// Schema for request body
const moveItemSchema = z.object({
  targetWishlistId: z.string().uuid(),
})

// PATCH - Move item to another wishlist
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    // Validate path parameters
    const { wishlistId, itemId } = pathParamsSchema.parse(params)

    // Parse and validate the request body
    const body = await request.json()
    const { targetWishlistId } = moveItemSchema.parse(body)

    // Check if source wishlist exists
    const sourceWishlist = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, wishlistId))
      .get()

    if (!sourceWishlist) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Quell-Wunschliste nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Check if target wishlist exists
    const targetWishlist = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, targetWishlistId))
      .get()

    if (!targetWishlist) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ziel-Wunschliste nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Check if item exists in the source wishlist
    const item = db
      .select()
      .from(wishlistItems)
      .where(
        and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId))
      )
      .get()

    if (!item) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Artikel nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Don't move if target is the same as source
    if (targetWishlistId === wishlistId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Artikel ist bereits in der Ziel-Wunschliste',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Update the item's wishlist ID
    const updatedItem = db
      .update(wishlistItems)
      .set({
        wishlistId: targetWishlistId,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, itemId))
      .returning()
      .get()

    if (!updatedItem) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Fehler beim Verschieben des Artikels',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Artikel erfolgreich verschoben',
        data: updatedItem,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error moving wishlist item:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ungültige Anfrageparameter',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Handle other errors
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Verschieben des Artikels',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}