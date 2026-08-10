// filepath: /Users/flori/Projects/toolio/src/lib/itunes/mapper.ts

/**
 * iTunes data mapper
 *
 * This module provides functions to map iTunes API response data to our database schema.
 * It handles different entity types like movies, TV shows, music, etc.
 */

import { mapCountryCode } from './helpers'

/**
 * Determines the type of the iTunes item based on its properties
 *
 * Exported for its own tests: every other mapping decision in this module keys
 * off the result, so it is worth pinning down directly.
 *
 * @param itunesData The raw data from iTunes API
 * @returns The type classification of the iTunes item
 */
export function determineItunesItemType(itunesData: any): {
  itunesIdType: 'track' | 'collection'
  itunesId: number
  mediaType: string
  entityType: string
} {
  // Default to track type
  let itunesIdType: 'track' | 'collection' = 'track'
  let itunesId = itunesData.trackId
  let mediaType = ''
  let entityType = ''

  // Handle wrapper type
  if (itunesData.wrapperType === 'collection') {
    itunesIdType = 'collection'
    itunesId = itunesData.collectionId

    // Determine media type based on collection type
    if (itunesData.collectionType?.includes('TV')) {
      mediaType = 'tvShow'
      entityType = 'tvSeason'
    } else if (itunesData.collectionType?.includes('Album')) {
      mediaType = 'music'
      entityType = 'album'
    } else {
      mediaType = itunesData.collectionType?.toLowerCase() || 'unknown'
      entityType = itunesData.collectionType?.toLowerCase() || 'unknown'
    }
  } else {
    // For tracks, movies, etc.
    mediaType =
      itunesData.kind?.split('-')[0] || itunesData.wrapperType || 'unknown'
    entityType = itunesData.kind || itunesData.wrapperType || 'unknown'
  }

  return {
    itunesIdType,
    itunesId,
    mediaType,
    entityType,
  }
}

/** Fields that have their own column, so they must not be duplicated into JSON. */
const MAPPED_FIELDS = [
  'id',
  'trackId',
  'collectionId',
  'wrapperType',
  'kind',
  'artistName',
  'trackName',
  'collectionName',
  'trackCensoredName',
  'collectionCensoredName',
  'trackViewUrl',
  'collectionViewUrl',
  'previewUrl',
  'artworkUrl30',
  'artworkUrl60',
  'artworkUrl100',
  'artworkUrl600',
  'releaseDate',
  'primaryGenreName',
  'longDescription',
  'country',
  'currency',
  'collectionType',
]

/** The largest artwork iTunes offered, in descending order of size. */
function pickArtworkUrl(itunesData: any): string | undefined {
  return (
    itunesData.artworkUrl600 ||
    itunesData.artworkUrl512 ||
    itunesData.artworkUrl300 ||
    itunesData.artworkUrl100 ||
    itunesData.artworkUrl60 ||
    itunesData.artworkUrl30
  )
}

/**
 * Everything iTunes returned that has no column of its own.
 *
 * Kept rather than dropped: iTunes varies its payload by media type, and the
 * watchlist reads several of these fields back out of the blob.
 */
function collectAdditionalData(itunesData: any): Record<string, any> {
  const additionalData: Record<string, any> = {}

  for (const [key, value] of Object.entries(itunesData)) {
    if (!MAPPED_FIELDS.includes(key) && value !== undefined) {
      additionalData[key] = value
    }
  }

  return additionalData
}

/**
 * Maps iTunes API data to our database schema for media items
 *
 * @param itunesData The raw data from iTunes API
 * @returns Formatted data matching our database schema
 */
export function mapItunesDataToMediaItem(itunesData: any) {
  // Determine the type of the iTunes item
  const { itunesIdType, itunesId, mediaType, entityType } =
    determineItunesItemType(itunesData)

  // Determine the name based on item type
  const name =
    itunesIdType === 'collection'
      ? itunesData.collectionName
      : itunesData.trackName

  // Determine the censored name based on item type
  const censoredName =
    itunesIdType === 'collection'
      ? itunesData.collectionCensoredName
      : itunesData.trackCensoredName

  // Determine the view URL based on item type
  const viewUrl =
    itunesIdType === 'collection'
      ? itunesData.collectionViewUrl
      : itunesData.trackViewUrl

  return {
    itunesId,
    itunesIdType,
    wrapperType: itunesData.wrapperType,
    mediaType,
    entityType,
    name,
    artistName: itunesData.artistName,
    censoredName,
    viewUrl,
    previewUrl: itunesData.previewUrl,
    artworkUrl: pickArtworkUrl(itunesData),
    releaseDate: itunesData.releaseDate
      ? new Date(itunesData.releaseDate)
      : null,
    primaryGenreName: itunesData.primaryGenreName,
    contentAdvisoryRating: itunesData.contentAdvisoryRating,
    description: itunesData.longDescription,
    country: mapCountryCode(itunesData.country),
    currency: itunesData.currency,
    additionalData: JSON.stringify(collectAdditionalData(itunesData)),
  }
}

/** The four headline price fields, which have their own columns. */
const HEADLINE_PRICE_FIELDS = [
  'trackPrice',
  'trackHdPrice',
  'collectionPrice',
  'collectionHdPrice',
]

/**
 * Price fields that do not fit the two columns.
 *
 * That is the opposite side's prices — a track row still records what the
 * collection cost, and vice versa — plus anything else price-shaped, such as
 * rental prices.
 */
function collectAdditionalPriceData(
  itunesData: any,
  itunesIdType: 'track' | 'collection',
): Record<string, any> {
  const additionalPriceData: Record<string, any> = {}
  const oppositeSide =
    itunesIdType === 'collection'
      ? ['trackPrice', 'trackHdPrice']
      : ['collectionPrice', 'collectionHdPrice']

  for (const field of oppositeSide) {
    if (itunesData[field] !== undefined) {
      additionalPriceData[field] = itunesData[field]
    }
  }

  for (const [key, value] of Object.entries(itunesData)) {
    const isPriceField =
      key.toLowerCase().includes('price') &&
      !HEADLINE_PRICE_FIELDS.includes(key)

    if (isPriceField && value !== undefined) additionalPriceData[key] = value
  }

  return additionalPriceData
}

/**
 * Maps iTunes API data to our price history schema
 *
 * @param itunesData The raw data from iTunes API
 * @param mediaItemId The ID of the related media item
 * @returns Formatted price data matching our database schema
 */
export function mapItunesDataToPriceHistory(
  itunesData: any,
  mediaItemId: string,
) {
  const { itunesIdType } = determineItunesItemType(itunesData)
  const isCollection = itunesIdType === 'collection'

  const standardPrice = isCollection
    ? itunesData.collectionPrice
    : itunesData.trackPrice
  const hdPrice = isCollection
    ? itunesData.collectionHdPrice
    : itunesData.trackHdPrice

  const additionalPriceData = collectAdditionalPriceData(
    itunesData,
    itunesIdType,
  )

  return {
    mediaItemId,
    standardPrice,
    hdPrice,
    currency: itunesData.currency,
    country: mapCountryCode(itunesData.country),
    additionalPriceData:
      Object.keys(additionalPriceData).length > 0
        ? JSON.stringify(additionalPriceData)
        : null,
  }
}
