import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import {
  itunesMediaItem,
  itunesMediaItemSchema,
  itunesPriceHistory,
  itunesPriceHistorySchema,
} from '@/db/schema/itunes'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Define a combined schema for the API
const itunesAddSchema = z.object({
  media: itunesMediaItemSchema,
  price: itunesPriceHistorySchema.omit({ mediaItemId: true }).optional(),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse and validate the request body
    const body = await request.json()

    // Convert releaseDate from string to Date if it's a string
    if (body.media && typeof body.media.releaseDate === 'string') {
      body.media.releaseDate = new Date(body.media.releaseDate)
    }

    const validated = itunesAddSchema.parse(body)

    // Check if the media item already exists
    const existingItem = db
      .select({ id: itunesMediaItem.id })
      .from(itunesMediaItem)
      .where(eq(itunesMediaItem.trackId, validated.media.trackId))
      .get()

    let mediaItemId: string

    if (existingItem) {
      // Update existing media item
      mediaItemId = existingItem.id
      db.update(itunesMediaItem)
        .set({
          ...validated.media,
          updatedAt: new Date(),
        })
        .where(eq(itunesMediaItem.id, mediaItemId))
        .run()
    } else {
      // Insert new media item
      const result = db
        .insert(itunesMediaItem)
        .values(validated.media)
        .returning({ id: itunesMediaItem.id })
        .get()

      mediaItemId = result.id
    }

    // Insert price history if provided
    if (validated.price) {
      db.insert(itunesPriceHistory)
        .values({
          ...validated.price,
          mediaItemId,
        })
        .run()
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Media item saved successfully',
        mediaItemId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error adding iTunes media item:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Validation error',
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
        message: 'Failed to add media item',
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
