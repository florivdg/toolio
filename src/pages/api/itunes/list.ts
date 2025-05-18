import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { desc, and, sql, SQL, eq } from 'drizzle-orm'
import { z } from 'zod'

// Define query parameters schema
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  artistName: z.string().optional(),
  trackName: z.string().optional(),
  genreName: z.string().optional(),
  withPrices: z.coerce.boolean().default(false),
})

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse and validate query parameters
    const params = Object.fromEntries(url.searchParams.entries())
    const validated = queryParamsSchema.parse(params)

    // Build filter conditions
    const whereConditions: SQL[] = []

    if (validated.artistName) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.artistName}) like lower(${'%' + validated.artistName + '%'})`,
      )
    }

    if (validated.trackName) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.trackName}) like lower(${'%' + validated.trackName + '%'})`,
      )
    }

    if (validated.genreName) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.primaryGenreName}) like lower(${'%' + validated.genreName + '%'})`,
      )
    }

    // Check if we should include prices
    if (validated.withPrices) {
      // Get all media items
      const mediaItems = db
        .select()
        .from(itunesMediaItem)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(itunesMediaItem.createdAt))
        .limit(validated.limit)
        .offset(validated.offset)
        .all()

      // Fetch all price histories for these media items
      const mediaItemIds = mediaItems.map((item) => item.id)

      // If there are no media items, return empty result
      if (mediaItemIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            count: 0,
            offset: validated.offset,
            limit: validated.limit,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }

      // Get all price histories for these media items
      const priceHistories = db
        .select()
        .from(itunesPriceHistory)
        .where(sql`${itunesPriceHistory.mediaItemId} IN ${mediaItemIds}`)
        .orderBy(desc(itunesPriceHistory.recordedAt))
        .all()

      // Group price histories by media item ID
      const priceHistoryMap = new Map()
      for (const price of priceHistories) {
        if (!priceHistoryMap.has(price.mediaItemId)) {
          priceHistoryMap.set(price.mediaItemId, [])
        }
        priceHistoryMap.get(price.mediaItemId).push(price)
      }

      // Combine media items with their price histories
      const itemsWithPrices = mediaItems.map((item) => ({
        ...item,
        prices: priceHistoryMap.get(item.id) || [],
      }))

      return new Response(
        JSON.stringify({
          success: true,
          data: itemsWithPrices,
          count: itemsWithPrices.length,
          offset: validated.offset,
          limit: validated.limit,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    } else {
      // Execute a simpler query without price history
      const mediaItems = db
        .select()
        .from(itunesMediaItem)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(itunesMediaItem.createdAt))
        .limit(validated.limit)
        .offset(validated.offset)
        .all()

      // Return media items without prices
      return new Response(
        JSON.stringify({
          success: true,
          data: mediaItems,
          count: mediaItems.length,
          offset: validated.offset,
          limit: validated.limit,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }
  } catch (error) {
    console.error('Error retrieving iTunes media items:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid query parameters',
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
        message: 'Failed to retrieve media items',
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
