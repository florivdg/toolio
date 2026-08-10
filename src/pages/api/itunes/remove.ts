import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { itunesMediaItem } from '@/db/schema/itunes'
import { eq } from 'drizzle-orm'
import { handleApiError, json, notFound } from '@/lib/api/responses'

// Define a schema for the remove API
const itunesRemoveSchema = z.object({
  id: z.uuid(), // The database ID of the media item
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
      return notFound('Medienelement nicht gefunden')
    }

    return json(
      {
        success: true,
        message: 'Medienelement erfolgreich entfernt',
        removedItemId: id,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error removing iTunes media item',
      message: 'Fehler beim Entfernen des Medienelements',
    })
  }
}
