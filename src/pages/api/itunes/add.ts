import type { APIRoute } from 'astro'
import { z } from 'zod'
import { lookupAndStoreItem } from '@/lib/itunes/storage'
import { handleApiError, json, notFound } from '@/lib/api/responses'

/** Thrown by the storage layer and answered with a 404 rather than a 500. */
const NOT_FOUND_IN_STORE = 'Item not found in iTunes store'

// Define a schema for the API that supports both track and collection IDs
const itunesAddSchema = z.object({
  itunesId: z.number(),
  isCollection: z.boolean().default(false),
  country: z.string().default('de'),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse and validate the request body
    const body = await request.json()
    const validated = itunesAddSchema.parse(body)
    const { itunesId, isCollection, country } = validated

    try {
      // Use the extracted function to lookup and store the item
      const { mediaItemId } = await lookupAndStoreItem(
        itunesId,
        isCollection,
        country,
      )

      return json(
        {
          success: true,
          message: 'Media item saved successfully',
          mediaItemId,
        },
        200,
      )
    } catch (error) {
      // A missing item is the caller's problem, not a server fault.
      if (error instanceof Error && error.message === NOT_FOUND_IN_STORE) {
        return notFound(NOT_FOUND_IN_STORE)
      }
      throw error // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    return handleApiError(error, {
      log: 'Error adding iTunes media item',
      message: 'Failed to add media item',
      validationMessage: 'Validation error',
    })
  }
}
