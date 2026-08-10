/**
 * Shared shapes for the iTunes Store API.
 *
 * The lookup and search endpoints return the same record — lookup simply never
 * populates the artist- and collection-level extras. Both clients described that
 * record separately, which is why the two field lists drifted apart.
 */

/** A single record as returned by any iTunes Store endpoint. */
export interface ItunesResult {
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
  // iTunes returns far more fields than we model; the index signature keeps
  // callers free to reach for one without widening this interface.
  [key: string]: any
}

/** The envelope every iTunes endpoint wraps its results in. */
export interface ItunesResponse<T extends ItunesResult = ItunesResult> {
  resultCount: number
  results: T[]
}
