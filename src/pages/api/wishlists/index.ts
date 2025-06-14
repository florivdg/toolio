import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlists, wishlistItems, wishlistSchema } from '@/db/schema/wishlists'
import { desc, count, eq } from 'drizzle-orm'

// Schema for query parameters
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// GET - List all wishlists
export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse and validate query parameters
    const params = Object.fromEntries(url.searchParams.entries())
    const { limit, offset } = queryParamsSchema.parse(params)

    // Fetch wishlists with item counts from database
    const wishlistsData = db
      .select({
        id: wishlists.id,
        name: wishlists.name,
        description: wishlists.description,
        createdAt: wishlists.createdAt,
        updatedAt: wishlists.updatedAt,
        itemCount: count(wishlistItems.id),
      })
      .from(wishlists)
      .leftJoin(wishlistItems, eq(wishlists.id, wishlistItems.wishlistId))
      .groupBy(wishlists.id)
      .orderBy(desc(wishlists.createdAt))
      .limit(limit)
      .offset(offset)
      .all()

    // Fetch latest 3 items for each wishlist
    const wishlistsWithItems = wishlistsData.map((wishlist) => {
      const latestItems = db
        .select({
          id: wishlistItems.id,
          name: wishlistItems.name,
          imageUrl: wishlistItems.imageUrl,
          url: wishlistItems.url,
          price: wishlistItems.price,
        })
        .from(wishlistItems)
        .where(eq(wishlistItems.wishlistId, wishlist.id))
        .orderBy(desc(wishlistItems.createdAt))
        .limit(3)
        .all()

      return {
        ...wishlist,
        latestItems,
      }
    })

    // Get total count for pagination
    const totalCount = db
      .select({ count: wishlists.id })
      .from(wishlists)
      .all().length

    return new Response(
      JSON.stringify({
        success: true,
        data: wishlistsWithItems,
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
    console.error('Error fetching wishlists:', error)

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
        message: 'Fehler beim Laden der Wunschlisten',
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

// POST - Create a new wishlist
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse and validate the request body
    const body = await request.json()
    const validated = wishlistSchema.parse(body)

    // Insert new wishlist into database
    const newWishlist = db
      .insert(wishlists)
      .values({
        ...validated,
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wunschliste erfolgreich erstellt',
        data: newWishlist,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error creating wishlist:', error)

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
        message: 'Fehler beim Erstellen der Wunschliste',
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
