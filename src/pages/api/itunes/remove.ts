import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { itunesMediaItem } from '@/db/schema/itunes'
import { eq } from 'drizzle-orm'

// Define a schema for the remove API
const itunesRemoveSchema = z.object({
  id: z.string().uuid(), // The database ID of the media item
})

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // Parse and validate the request body
    const body = await request.json()
    const validated = itunesRemoveSchema.parse(body)
    const { id } = validated

    // Try to find and delete the item
    const deletedItems = db
      .delete(itunesMediaItem)
      .where(eq(itunesMediaItem.id, id))
      .returning()
      .all()

    if (deletedItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Medienelement nicht gefunden',
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
        message: 'Medienelement erfolgreich entfernt',
        removedItemId: id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error removing iTunes media item:', error)

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
        message: 'Fehler beim Entfernen des Medienelements',
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
