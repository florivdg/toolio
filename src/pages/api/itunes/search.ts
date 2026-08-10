import type { APIRoute } from 'astro'
import { search, type SearchResponse } from '@/lib/itunes/search'
import { z } from 'zod'
import { handleApiError, json } from '@/lib/api/responses'

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

    // Automatically set entity to "tvSeason" when media is "tvShow"
    let entity = validated.entity
    if (validated.media === 'tvShow' && !entity) {
      entity = 'tvSeason'
    }

    // Call the iTunes search API
    const searchResponse: SearchResponse = await search({
      term: validated.term,
      media: validated.media,
      entity,
      country: validated.country,
      limit: validated.limit,
    })

    // Return the search results
    return json(
      {
        success: true,
        resultCount: searchResponse.resultCount,
        results: searchResponse.results,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error searching iTunes',
      message: 'Failed to search iTunes',
      validationMessage: 'Invalid query parameters',
    })
  }
}
