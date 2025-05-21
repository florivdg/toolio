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
  kind: string
  trackId: number
  artistName: string
  trackName: string
  trackCensoredName: string
  trackViewUrl: string
  previewUrl: string
  artworkUrl30: string
  artworkUrl60: string
  artworkUrl100: string
  collectionPrice?: number
  trackPrice?: number
  collectionHdPrice?: number
  trackHdPrice?: number
  releaseDate: string
  collectionExplicitness: string
  trackExplicitness: string
  trackTimeMillis: number
  country: string
  currency: string
  primaryGenreName: string
  contentAdvisoryRating: string
  longDescription: string
  [key: string]: any // Allow for additional properties
}

/**
 * Search the iTunes store
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

  // Add required term parameter
  url.searchParams.append('term', term)

  // Add optional parameters if provided
  if (media) url.searchParams.append('media', media)
  if (entity) url.searchParams.append('entity', entity)
  url.searchParams.append('country', country)
  url.searchParams.append('limit', limit.toString())

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(
      `iTunes search failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as SearchResponse
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
