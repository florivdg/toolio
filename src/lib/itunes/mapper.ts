// filepath: /Users/flori/Projects/toolio/src/lib/itunes/mapper.ts

/**
 * iTunes data mapper
 *
 * This module provides functions to map iTunes API response data to our database schema.
 * It handles different entity types like movies, TV shows, music, etc.
 */

/**
 * Determines the type of the iTunes item based on its properties
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

  // Get the best available artwork URL
  const artworkUrl =
    itunesData.artworkUrl600 ||
    itunesData.artworkUrl512 ||
    itunesData.artworkUrl300 ||
    itunesData.artworkUrl100 ||
    itunesData.artworkUrl60 ||
    itunesData.artworkUrl30

  // Collect additional data that doesn't fit in our standard schema
  const additionalData: Record<string, any> = {}

  // Add entity-specific fields to additionalData
  for (const [key, value] of Object.entries(itunesData)) {
    // Skip fields that are already mapped to our schema
    const standardFields = [
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

    if (!standardFields.includes(key) && value !== undefined) {
      additionalData[key] = value
    }
  }

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
    artworkUrl,
    releaseDate: itunesData.releaseDate
      ? new Date(itunesData.releaseDate)
      : null,
    primaryGenreName: itunesData.primaryGenreName,
    contentAdvisoryRating: itunesData.contentAdvisoryRating,
    description: itunesData.longDescription,
    country: itunesData.country,
    currency: itunesData.currency,
    additionalData: JSON.stringify(additionalData),
  }
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
  // Determine the type of the iTunes item
  const { itunesIdType } = determineItunesItemType(itunesData)

  // Set the standard price based on item type
  const standardPrice =
    itunesIdType === 'collection'
      ? itunesData.collectionPrice
      : itunesData.trackPrice

  // Set the HD price based on item type
  const hdPrice =
    itunesIdType === 'collection'
      ? itunesData.collectionHdPrice
      : itunesData.trackHdPrice

  // Collect additional price data
  const additionalPriceData: Record<string, any> = {}

  // Add all price-related fields to additionalPriceData
  if (itunesData.trackPrice !== undefined && itunesIdType === 'collection') {
    additionalPriceData.trackPrice = itunesData.trackPrice
  }

  if (itunesData.trackHdPrice !== undefined && itunesIdType === 'collection') {
    additionalPriceData.trackHdPrice = itunesData.trackHdPrice
  }

  if (itunesData.collectionPrice !== undefined && itunesIdType === 'track') {
    additionalPriceData.collectionPrice = itunesData.collectionPrice
  }

  if (itunesData.collectionHdPrice !== undefined && itunesIdType === 'track') {
    additionalPriceData.collectionHdPrice = itunesData.collectionHdPrice
  }

  // Add any other price-related fields
  for (const [key, value] of Object.entries(itunesData)) {
    if (
      key.toLowerCase().includes('price') &&
      ![
        'trackPrice',
        'trackHdPrice',
        'collectionPrice',
        'collectionHdPrice',
      ].includes(key) &&
      value !== undefined
    ) {
      additionalPriceData[key] = value
    }
  }

  return {
    mediaItemId,
    standardPrice,
    hdPrice,
    currency: itunesData.currency,
    country: itunesData.country,
    additionalPriceData:
      Object.keys(additionalPriceData).length > 0
        ? JSON.stringify(additionalPriceData)
        : null,
  }
}
