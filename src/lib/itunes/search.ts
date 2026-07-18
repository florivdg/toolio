// filepath: /Users/flori/Projects/toolio/src/lib/itunes/search.ts
/**
 * iTunes search API client
 *
 * This module provides functions to search for items in the iTunes Store.
 */

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
export interface SearchResponse {
  resultCount: number
  results: SearchResult[]
}

/**
 * Result from the iTunes search API
 */
export interface SearchResult {
  wrapperType: string
  kind?: string
  collectionType?: string
  trackId?: number
  collectionId?: number
  artistId?: number
  artistName: string
  trackName?: string
  collectionName?: string
  trackCensoredName?: string
  collectionCensoredName?: string
  artistViewUrl?: string
  trackViewUrl?: string
  collectionViewUrl?: string
  previewUrl?: string
  artworkUrl30?: string
  artworkUrl60?: string
  artworkUrl100?: string
  artworkUrl600?: string
  collectionPrice?: number
  trackPrice?: number
  collectionHdPrice?: number
  trackHdPrice?: number
  releaseDate: string
  collectionExplicitness?: string
  trackExplicitness?: string
  trackTimeMillis?: number
  country: string
  currency: string
  primaryGenreName: string
  contentAdvisoryRating?: string
  longDescription?: string
  shortDescription?: string
  trackCount?: number
  copyright?: string
  [key: string]: any // Allow for additional properties
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

/**
 * Search for movies in the iTunes store
 *
 * @param term The search term
 * @param country The country code (defaults to "de")
 * @param limit Maximum number of results to return (defaults to 20)
 * @returns The search response with results
 */
export async function searchMovies(
  term: string,
  country = 'de',
  limit = 20,
): Promise<SearchResponse> {
  return search({ term, media: 'movie', country, limit })
}

/**
 * Search for TV shows in the iTunes store
 *
 * @param term The search term
 * @param country The country code (defaults to "de")
 * @param limit Maximum number of results to return (defaults to 20)
 * @returns The search response with results
 */
export async function searchTVShows(
  term: string,
  country = 'de',
  limit = 20,
): Promise<SearchResponse> {
  return search({ term, media: 'tvShow', entity: 'tvSeason', country, limit })
}

/**
 * Search for music in the iTunes store
 *
 * @param term The search term
 * @param country The country code (defaults to "de")
 * @param limit Maximum number of results to return (defaults to 20)
 * @returns The search response with results
 */
export async function searchMusic(
  term: string,
  country = 'de',
  limit = 20,
): Promise<SearchResponse> {
  return search({ term, media: 'music', country, limit })
}
