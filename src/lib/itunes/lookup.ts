/**
 * iTunes lookup API client
 *
 * This module provides functions to lookup items in the iTunes Store by ID and country.
 */

interface LookupParams {
  /**
   * iTunes ID to lookup (can be trackId or collectionId)
   */
  id: number

  /**
   * Country code for the iTunes store (defaults to "de")
   */
  country?: string
}

interface ItemResult {
  wrapperType: string
  kind?: string
  collectionType?: string
  trackId?: number
  collectionId?: number
  artistName: string
  trackName?: string
  collectionName?: string
  trackCensoredName?: string
  collectionCensoredName?: string
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
  [key: string]: any // Allow for additional properties
}

interface LookupResponse {
  resultCount: number
  results: ItemResult[]
}

/**
 * Lookup an item in the iTunes store by ID and country
 *
 * @param params The lookup parameters
 * @returns The lookup response with results
 */
export async function lookup({
  id,
  country = 'de',
}: LookupParams): Promise<LookupResponse> {
  const url = new URL('https://itunes.apple.com/lookup')
  url.searchParams.append('id', id.toString())
  url.searchParams.append('country', country)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(
      `iTunes lookup failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as LookupResponse
}

/**
 * Lookup a track in the iTunes store by trackId and country
 *
 * @param trackId The iTunes trackId to lookup
 * @param country The country code (defaults to "de")
 * @returns The lookup response with results
 */
export async function lookupTrack(
  trackId: number,
  country = 'de',
): Promise<LookupResponse> {
  return lookup({ id: trackId, country })
}

/**
 * Lookup a collection in the iTunes store by collectionId and country
 *
 * @param collectionId The iTunes collectionId to lookup
 * @param country The country code (defaults to "de")
 * @returns The lookup response with results
 */
export async function lookupCollection(
  collectionId: number,
  country = 'de',
): Promise<LookupResponse> {
  return lookup({ id: collectionId, country })
}
