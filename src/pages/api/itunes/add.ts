import type { APIRoute } from 'astro'
import { z } from 'zod'
import { lookupAndStoreItem } from '@/lib/itunes/storage'

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
      // Handle specific errors from our library functions
      if (
        error instanceof Error &&
        error.message === 'Item not found in iTunes store'
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Item not found in iTunes store',
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
      throw error // Re-throw to be caught by outer catch block
    }
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
