import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  wishlists,
  wishlistItems,
  wishlistItemSchema,
} from '@/db/schema/wishlists'
import { eq, and } from 'drizzle-orm'

// Schema for path parameters
const pathParamsSchema = z.object({
  wishlistId: z.string().uuid(),
  itemId: z.string().uuid(),
})

// Schema for partial updates - all fields optional except id, wishlistId, createdAt
const wishlistItemUpdateSchema = wishlistItemSchema.partial().omit({
  id: true,
  wishlistId: true,
  createdAt: true,
})

// GET - Get a specific wishlist item
export const GET: APIRoute = async ({ params }) => {
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

    // Fetch wishlist item from database
    const item = db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.id, itemId),
          eq(wishlistItems.wishlistId, wishlistId),
        ),
      )
      .get()

    if (!item) {
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

    return new Response(
      JSON.stringify({
        success: true,
        data: item,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching wishlist item:', error)

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
        message: 'Fehler beim Laden des Wunschlistenelements',
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

// PUT - Update a specific wishlist item
export const PUT: APIRoute = async ({ params, request }) => {
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
    const validated = wishlistItemUpdateSchema.parse(body)

    // Check if at least one field is provided for update
    const providedFields = Object.keys(validated).filter(
      (key) => validated[key as keyof typeof validated] !== undefined,
    )

    if (providedFields.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Mindestens ein Feld muss für die Aktualisierung angegeben werden',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

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

    // Only update fields that were provided in the request
    const updateData = {
      ...validated,
      updatedAt: new Date(),
    }

    // Remove undefined values to avoid updating with undefined, but keep null values
    // to allow clearing fields
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined),
    )

    // Update wishlist item in database
    const updatedItem = db
      .update(wishlistItems)
      .set(cleanUpdateData)
      .where(
        and(
          eq(wishlistItems.id, itemId),
          eq(wishlistItems.wishlistId, wishlistId),
        ),
      )
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschlistenelement erfolgreich aktualisiert',
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
    console.error('Error updating wishlist item:', error)

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
        message: 'Fehler beim Aktualisieren des Wunschlistenelements',
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

// DELETE - Delete a specific wishlist item
export const DELETE: APIRoute = async ({ params }) => {
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

    // Try to find and delete the wishlist item
    const deletedItem = db
      .delete(wishlistItems)
      .where(
        and(
          eq(wishlistItems.id, itemId),
          eq(wishlistItems.wishlistId, wishlistId),
        ),
      )
      .returning()
      .get()

    if (!deletedItem) {
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschlistenelement erfolgreich gelöscht',
        deletedId: itemId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error deleting wishlist item:', error)

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
        message: 'Fehler beim Löschen des Wunschlistenelements',
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
