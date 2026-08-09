import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { wishlists, wishlistItems, wishlistSchema } from '@/db/schema/wishlists'
import { desc, count, eq } from 'drizzle-orm'
import { json } from '@/lib/api/responses'
import { handleApiError } from '@/lib/api/wishlist-guards'

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
    const countResult = db.select({ count: count() }).from(wishlists).get()
    const totalCount = countResult?.count ?? 0

    // Carries a pagination block alongside data, so it does not use ok().
    return json(
      {
        success: true,
        data: wishlistsWithItems,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error fetching wishlists',
      message: 'Fehler beim Laden der Wunschlisten',
    })
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

    const responseData = {
      ...newWishlist,
      itemCount: 0,
      latestItems: [],
    }

    // 201 rather than the 200 that ok() returns.
    return json(
      {
        success: true,
        message: 'Wunschliste erfolgreich erstellt',
        data: responseData,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error creating wishlist',
      message: 'Fehler beim Erstellen der Wunschliste',
    })
  }
}
