import type { APIRoute } from 'astro'
import { z } from 'zod'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '@/db/database'
import { wishlistItems, wishlistItemSchema } from '@/db/schema/wishlists'
import { json } from '@/lib/api/responses'
import { handleApiError, requireWishlist } from '@/lib/api/wishlist-guards'

/**
 * `z.coerce.boolean()` is Boolean(value), so every non-empty string — including
 * 'false' — becomes true, which made ?purchased=false return purchased items.
 * Match the literal strings instead and reject anything else.
 */
const booleanParam = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional()

// Schema for query parameters
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  purchased: booleanParam,
  active: booleanParam,
})

// Schema for path parameters
const pathParamsSchema = z.object({
  wishlistId: z.uuid(),
})

// GET - List all items in a wishlist
export const GET: APIRoute = async ({ params, url }) => {
  try {
    const { wishlistId } = pathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    const { limit, offset, purchased, active } = queryParamsSchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    )

    const whereConditions = [eq(wishlistItems.wishlistId, wishlistId)]

    if (purchased !== undefined) {
      whereConditions.push(eq(wishlistItems.isPurchased, purchased))
    }

    if (active !== undefined) {
      whereConditions.push(eq(wishlistItems.isActive, active))
    }

    const scope = and(...whereConditions)

    const items = db
      .select()
      .from(wishlistItems)
      .where(scope)
      .orderBy(desc(wishlistItems.priority), desc(wishlistItems.createdAt))
      .limit(limit)
      .offset(offset)
      .all()

    // Counted under the same predicate so pagination reflects the filtered set.
    const totalCount =
      db.select({ count: count() }).from(wishlistItems).where(scope).get()
        ?.count ?? 0

    return json(
      {
        success: true,
        data: items,
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
      log: 'Error fetching wishlist items',
      message: 'Fehler beim Laden der Wunschlistenelemente',
    })
  }
}

// POST - Create a new wishlist item
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { wishlistId } = pathParamsSchema.parse(params)

    const wishlist = requireWishlist(wishlistId)
    if (wishlist.response) return wishlist.response

    // wishlistId comes from the path, so a body cannot file an item elsewhere.
    const validated = wishlistItemSchema.parse({
      ...(await request.json()),
      wishlistId,
    })

    const newItem = db
      .insert(wishlistItems)
      .values({ ...validated, updatedAt: new Date() })
      .returning()
      .get()

    return json(
      {
        success: true,
        message: 'Wunschlistenelement erfolgreich erstellt',
        data: newItem,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error creating wishlist item',
      message: 'Fehler beim Erstellen des Wunschlistenelements',
    })
  }
}
