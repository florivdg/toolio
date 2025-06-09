import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  wishlists,
  wishlistItems,
  wishlistItemSchema,
} from '@/db/schema/wishlists'
import { eq, and, desc } from 'drizzle-orm'

// Schema for query parameters
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  purchased: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
})

// Schema for path parameters
const pathParamsSchema = z.object({
  wishlistId: z.string().uuid(),
}) // GET - List all items in a wishlist
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentifizierung erforderlich',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Validate path parameters
    const { wishlistId } = pathParamsSchema.parse(params)

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

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const { limit, offset, purchased, active } =
      queryParamsSchema.parse(queryParams)

    // Build where conditions
    const whereConditions = [eq(wishlistItems.wishlistId, wishlistId)]

    if (purchased !== undefined) {
      whereConditions.push(eq(wishlistItems.isPurchased, purchased))
    }

    if (active !== undefined) {
      whereConditions.push(eq(wishlistItems.isActive, active))
    }

    // Fetch wishlist items from database
    const items = db
      .select()
      .from(wishlistItems)
      .where(and(...whereConditions))
      .orderBy(desc(wishlistItems.priority), desc(wishlistItems.createdAt))
      .limit(limit)
      .offset(offset)
      .all()

    // Get total count for pagination
    const totalCount = db
      .select({ count: wishlistItems.id })
      .from(wishlistItems)
      .where(and(...whereConditions))
      .all().length

    return new Response(
      JSON.stringify({
        success: true,
        data: items,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
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
    console.error('Error fetching wishlist items:', error)

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
        message: 'Fehler beim Laden der Wunschlistenelemente',
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
} // POST - Create a new wishlist item
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentifizierung erforderlich',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Validate path parameters
    const { wishlistId } = pathParamsSchema.parse(params)

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
    const validated = wishlistItemSchema.parse({
      ...body,
      wishlistId,
    })

    // Insert new wishlist item into database
    const newItem = db
      .insert(wishlistItems)
      .values({
        ...validated,
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschlistenelement erfolgreich erstellt',
        data: newItem,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error creating wishlist item:', error)

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
        message: 'Fehler beim Erstellen des Wunschlistenelements',
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
