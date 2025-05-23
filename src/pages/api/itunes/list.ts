import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { desc, and, sql, SQL } from 'drizzle-orm'
import { z } from 'zod'

// Define query parameters schema
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  artistName: z.string().optional(),
  name: z.string().optional(),
  genreName: z.string().optional(),
  mediaType: z.string().optional(),
  entityType: z.string().optional(),
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

    if (validated.name) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.name}) like lower(${'%' + validated.name + '%'})`,
      )
    }

    if (validated.genreName) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.primaryGenreName}) like lower(${'%' + validated.genreName + '%'})`,
      )
    }

    if (validated.mediaType) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.mediaType}) like lower(${'%' + validated.mediaType + '%'})`,
      )
    }

    if (validated.entityType) {
      whereConditions.push(
        sql`lower(${itunesMediaItem.entityType}) like lower(${'%' + validated.entityType + '%'})`,
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

      // Process additional data and price data stored as JSON
      const itemsWithPrices = mediaItems.map((item) => {
        // Parse additionalData if it exists
        let parsedItem = { ...item }
        if (item.additionalData) {
          try {
            parsedItem.additionalData = JSON.parse(item.additionalData)
          } catch (e) {
            console.error(
              `Failed to parse additionalData for item ${item.id}:`,
              e,
            )
          }
        }

        // Get price history and parse additionalPriceData
        const prices = priceHistoryMap.get(item.id) || []
        const parsedPrices = prices.map((price: any) => {
          let parsedPrice = { ...price }
          if (price.additionalPriceData) {
            try {
              parsedPrice.additionalPriceData = JSON.parse(
                price.additionalPriceData,
              )
            } catch (e) {
              console.error(
                `Failed to parse additionalPriceData for price ${price.id}:`,
                e,
              )
            }
          }
          return parsedPrice
        })

        return {
          ...parsedItem,
          prices: parsedPrices,
        }
      })

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

      // Parse additionalData if it exists
      const parsedItems = mediaItems.map((item) => {
        let parsedItem = { ...item }
        if (item.additionalData) {
          try {
            parsedItem.additionalData = JSON.parse(item.additionalData)
          } catch (e) {
            console.error(
              `Failed to parse additionalData for item ${item.id}:`,
              e,
            )
          }
        }
        return parsedItem
      })

      // Return media items without prices
      return new Response(
        JSON.stringify({
          success: true,
          data: parsedItems,
          count: parsedItems.length,
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
