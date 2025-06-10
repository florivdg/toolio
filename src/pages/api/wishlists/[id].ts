import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlists, wishlistItems, wishlistSchema } from '@/db/schema/wishlists'
import { eq } from 'drizzle-orm'

// Schema for path parameters
const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

// GET - Get a specific wishlist with its items
export const GET: APIRoute = async ({ params }) => {
  try {
    // Validate path parameters
    const { id } = pathParamsSchema.parse(params)

    // Fetch wishlist from database
    const wishlist = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, id))
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

    // Fetch wishlist items
    const items = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, id))
      .orderBy(wishlistItems.priority, wishlistItems.createdAt)
      .all()

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...wishlist,
          items,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching wishlist:', error)

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
        message: 'Fehler beim Laden der Wunschliste',
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

// PUT - Update a specific wishlist
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    // Validate path parameters
    const { id } = pathParamsSchema.parse(params)

    // Parse and validate the request body
    const body = await request.json()
    const validated = wishlistSchema.parse(body)

    // Check if wishlist exists
    const existingWishlist = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, id))
      .get()

    if (!existingWishlist) {
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

    // Update wishlist in database
    const updatedWishlist = db
      .update(wishlists)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(wishlists.id, id))
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschliste erfolgreich aktualisiert',
        data: updatedWishlist,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error updating wishlist:', error)

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
        message: 'Fehler beim Aktualisieren der Wunschliste',
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

// DELETE - Delete a specific wishlist
export const DELETE: APIRoute = async ({ params }) => {
  try {
    // Validate path parameters
    const { id } = pathParamsSchema.parse(params)

    // Try to find and delete the wishlist
    const deletedWishlist = db
      .delete(wishlists)
      .where(eq(wishlists.id, id))
      .returning()
      .get()

    if (!deletedWishlist) {
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschliste erfolgreich gelöscht',
        deletedId: id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error deleting wishlist:', error)

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
        message: 'Fehler beim Löschen der Wunschliste',
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
