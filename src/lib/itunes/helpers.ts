/**
 * Formatting utility functions
 *
 * This module provides reusable formatting functions for common data types
 * like dates, prices, and media types.
 */

import type { SearchResult } from '@/lib/itunes/search'

/**
 * Format a date string for German locale
 *
 * @param dateString The date string to format
 * @returns Formatted date string in German locale
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Format a price with currency for German locale
 *
 * @param price The price amount (undefined means free)
 * @param currency The currency code
 * @returns Formatted price string in German
 */
export function formatPrice(
  price: number | undefined,
  currency: string,
): string {
  if (!price) return 'Kostenlos'

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price)
  } catch {
    return `${price} ${currency || 'EUR'}`
  }
}

/**
 * Get localized media type label for iTunes search results
 *
 * @param result The iTunes search result
 * @returns Localized German media type label
 */
export function getMediaType(result: SearchResult): string {
  if (result.kind) {
    switch (result.kind) {
      case 'song':
        return 'Titel'
      case 'album':
        return 'Album'
      case 'artist':
        return 'Künstler'
      case 'podcast':
        return 'Podcast'
      case 'audiobook':
        return 'Hörbuch'
      case 'music-video':
        return 'Musikvideo'
      case 'tv-episode':
        return 'TV-Folge'
      case 'tv-season':
        return 'TV-Staffel'
      case 'feature-movie':
        return 'Film'
      case 'software':
        return 'App'
      case 'ebook':
        return 'Buch'
      default:
        return result.kind
    }
  }

  // Fallback based on wrapper type or media type
  if (result.wrapperType === 'track') return 'Titel'
  if (result.wrapperType === 'collection') return 'Sammlung'
  if (result.wrapperType === 'artist') return 'Künstler'

  return 'Medien'
}

/** Shown when a result carries no artwork at all. */
export const ARTWORK_PLACEHOLDER = '/placeholder-image.svg'

/**
 * Upgrade an iTunes artwork URL to a larger webp rendition.
 *
 * iTunes encodes the size in the filename, so swapping it is how a bigger
 * image is requested. Anything without a recognised size is returned unchanged.
 */
export function optimizeArtworkUrl(baseUrl: string): string {
  return baseUrl
    .replace('/100x100bb.jpg', '/536x0w.webp')
    .replace('/60x60bb.jpg', '/536x0w.webp')
    .replace('/30x30bb.jpg', '/536x0w.webp')
    .replace('/600x600bb.jpg', '/536x0w.webp')
}

/**
 * Get optimized artwork URL from iTunes search result
 *
 * @param result The iTunes search result
 * @returns Optimized artwork URL or placeholder
 */
export function getArtworkUrl(result: SearchResult): string {
  const baseUrl =
    result.artworkUrl600 ||
    result.artworkUrl100 ||
    result.artworkUrl60 ||
    result.artworkUrl30

  return baseUrl ? optimizeArtworkUrl(baseUrl) : ARTWORK_PLACEHOLDER
}

/**
 * The iTunes id of a result, preferring the track over the collection.
 *
 * @throws When the result carries neither, which means it cannot be stored
 */
export function getItunesId(result: SearchResult): number {
  if (typeof result.trackId === 'number') return result.trackId
  if (typeof result.collectionId === 'number') return result.collectionId

  throw new Error('Kein gültiger iTunes-Identifier gefunden.')
}

/**
 * The price to show for a search result, preferring HD over standard.
 *
 * @returns The formatted price, or null when the result has no price
 */
export function getResultPrice(result: SearchResult): string | null {
  const price =
    result.trackHdPrice ||
    result.collectionHdPrice ||
    result.trackPrice ||
    result.collectionPrice

  // A result with only an HD price and no base price is a data anomaly rather
  // than something for sale, so the base price gates the whole lookup.
  if (!result.trackPrice && !result.collectionPrice) return null

  return price && result.currency ? formatPrice(price, result.currency) : null
}

/**
 * Handle image loading errors by setting a fallback placeholder
 *
 * @param event The error event from the image element
 */
export function handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement
  img.src = '/placeholder-image.svg'
}

/**
 * Map iTunes API country codes to iTunes lookup API country codes
 * Only implements mapping for German stores, fallback to "de" for all others
 *
 * @param countryCode The country code from iTunes API response (unused)
 * @returns The country code for iTunes lookup API (always "de")
 */
export function mapCountryCode(_countryCode: string | undefined): string {
  return 'de'
}
