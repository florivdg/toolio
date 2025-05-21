import type { APIRoute } from 'astro'
import { search, type SearchResponse } from '@/lib/itunes/search'
import { z } from 'zod'

// Define query parameters schema
const queryParamsSchema = z.object({
  term: z.string().min(1, 'Search term is required'),
  media: z.string().optional(),
  entity: z.string().optional(),
  country: z.string().default('de'),
  limit: z.coerce.number().min(1).max(200).default(20),
})

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse and validate query parameters
    const params = Object.fromEntries(url.searchParams.entries())
    const validated = queryParamsSchema.parse(params)

    // Call the iTunes search API
    const searchResponse: SearchResponse = await search({
      term: validated.term,
      media: validated.media,
      entity: validated.entity,
      country: validated.country,
      limit: validated.limit,
    })

    // Return the search results
    return new Response(
      JSON.stringify({
        success: true,
        resultCount: searchResponse.resultCount,
        results: searchResponse.results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error searching iTunes:', error)

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
        message: 'Failed to search iTunes',
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
