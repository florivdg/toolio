// filepath: /Users/flori/Projects/toolio/src/lib/itunes/search.ts
/**
 * iTunes search API client
 *
 * This module provides functions to search for items in the iTunes Store.
 */

import type { ItunesResponse, ItunesResult } from './types'

/**
 * Parameters for iTunes search API
 */
export interface SearchParams {
  /**
   * The search term to look for
   */
  term: string

  /**
   * The media type to search for (movie, tvShow, music, etc.)
   */
  media?: string

  /**
   * The entity type to search for (depends on the media type)
   */
  entity?: string

  /**
   * Country code for the iTunes store (defaults to "de")
   */
  country?: string

  /**
   * Maximum number of results to return (defaults to 20, max 200)
   */
  limit?: number
}

/**
 * Response from the iTunes search API
 */
export type SearchResponse = ItunesResponse<SearchResult>

/**
 * Result from the iTunes search API
 *
 * Search returns everything lookup does plus the artist- and collection-level
 * fields below, which lookup never populates.
 */
export interface SearchResult extends ItunesResult {
  artistId?: number
  artistViewUrl?: string
  shortDescription?: string
  trackCount?: number
  copyright?: string
}

/**
 * Server-side kind filter for media types where the iTunes API `media`
 * parameter is broken (e.g. `media=movie` returns 0 results).
 */
const FALLBACK_KIND_FILTER: Record<string, string[]> = {
  movie: ['feature-movie'],
}

/**
 * Search the iTunes store
 *
 * The iTunes API `media=movie` filter is broken and returns 0 results.
 * For movies we fetch unfiltered results and filter server-side by `kind`.
 * For TV shows and music the API filters still work and are passed through.
 *
 * @param params The search parameters
 * @returns The search response with results
 */
export async function search({
  term,
  media,
  entity,
  country = 'de',
  limit = 20,
}: SearchParams): Promise<SearchResponse> {
  const url = new URL('https://itunes.apple.com/search')

  url.searchParams.append('term', term)
  url.searchParams.append('country', country)

  const kindFilter = media ? FALLBACK_KIND_FILTER[media] : undefined

  if (!kindFilter) {
    // Only bypass filters with a configured server-side fallback. All other
    // media and entity values must retain their original pass-through behavior.
    if (media) url.searchParams.append('media', media)
    if (entity) url.searchParams.append('entity', entity)
  }

  // Broken filters require overfetching before applying their local filter.
  const fetchLimit = kindFilter ? Math.min(limit * 5, 200) : limit
  url.searchParams.append('limit', fetchLimit.toString())

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(
      `iTunes search failed: ${response.status} ${response.statusText}`,
    )
  }

  const data = (await response.json()) as SearchResponse

  if (!kindFilter) {
    return data
  }

  const filtered = data.results
    .filter((r) => r.kind && kindFilter.includes(r.kind))
    .slice(0, limit)

  return { resultCount: filtered.length, results: filtered }
}
