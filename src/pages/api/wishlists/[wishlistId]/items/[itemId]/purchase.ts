import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlists, wishlistItems } from '@/db/schema/wishlists'
import { eq, and } from 'drizzle-orm'

// Schema for updating purchase status
const purchaseStatusSchema = z.object({
  isPurchased: z.boolean(),
})

// Schema for path parameters
const pathParamsSchema = z.object({
  wishlistId: z.string().uuid(),
  itemId: z.string().uuid(),
})

// PATCH - Update purchase status of a wishlist item
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    // Validate path parameters
    const { wishlistId, itemId } = pathParamsSchema.parse(params)

    // Check if wishlist exists
    const wishlist = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, wishlistId))
      .get()

    if (!wishlist) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Wunschliste nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Parse and validate the request body
    const body = await request.json()
    const { isPurchased } = purchaseStatusSchema.parse(body)

    // Check if wishlist item exists
    const existingItem = db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.id, itemId),
          eq(wishlistItems.wishlistId, wishlistId),
        ),
      )
      .get()

    if (!existingItem) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Wunschlistenelement nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Update purchase status in database
    const updatedItem = db
      .update(wishlistItems)
      .set({
        isPurchased,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wishlistItems.id, itemId),
          eq(wishlistItems.wishlistId, wishlistId),
        ),
      )
      .returning()
      .get()

    const statusMessage = isPurchased
      ? 'Als gekauft markiert'
      : 'Als nicht gekauft markiert'

    return new Response(
      JSON.stringify({
        success: true,
        message: `Wunschlistenelement erfolgreich ${statusMessage}`,
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
    console.error('Error updating purchase status:', error)

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
        message: 'Fehler beim Aktualisieren des Kaufstatus',
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
