/**
 * iTunes data storage utilities
 *
 * This module provides functions to map and store iTunes data in the database.
 */
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { eq } from 'drizzle-orm'
import { lookupTrack } from './lookup'

/**
 * Lookup and store an iTunes track by its trackId
 *
 * @param trackId The iTunes trackId to lookup and store
 * @param country The country code (defaults to "de")
 * @returns The mediaItemId and a flag indicating if it was newly created
 */
export async function lookupAndStoreTrack(trackId: number, country = 'de') {
  // Use the lookup function to get iTunes data
  const lookupResponse = await lookupTrack(trackId, country)

  if (lookupResponse.resultCount === 0) {
    throw new Error('Item not found in iTunes store')
  }

  // Get the first result (should be the one we want)
  const itunesData = lookupResponse.results[0]

  // Map the data and save it
  const mediaItemId = await saveItunesMediaItem(itunesData)

  // Always create a new price history entry
  await savePriceHistory(mediaItemId, itunesData)

  return { mediaItemId }
}

/**
 * Maps iTunes API data to our database schema
 *
 * @param itunesData The raw data from iTunes API
 * @returns Formatted data matching our database schema
 */
export function mapItunesDataToMediaItem(itunesData: any) {
  return {
    trackId: itunesData.trackId,
    wrapperType: itunesData.wrapperType,
    kind: itunesData.kind,
    artistName: itunesData.artistName,
    trackName: itunesData.trackName,
    trackCensoredName: itunesData.trackCensoredName,
    trackViewUrl: itunesData.trackViewUrl,
    previewUrl: itunesData.previewUrl,
    artworkUrl: itunesData.artworkUrl100, // Use the highest quality artwork available
    releaseDate: new Date(itunesData.releaseDate),
    primaryGenreName: itunesData.primaryGenreName,
    description: itunesData.longDescription,
    country: itunesData.country,
    currency: itunesData.currency,
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
  return {
    mediaItemId,
    trackPrice: itunesData.trackPrice,
    trackHdPrice: itunesData.trackHdPrice,
    collectionPrice: itunesData.collectionPrice,
    collectionHdPrice: itunesData.collectionHdPrice,
    currency: itunesData.currency,
    country: itunesData.country,
  }
}

/**
 * Save or update an iTunes media item in the database
 *
 * @param itunesData The iTunes track data
 * @returns The ID of the saved media item
 */
export async function saveItunesMediaItem(itunesData: any): Promise<string> {
  // Check if the media item already exists
  const existingItem = db
    .select({ id: itunesMediaItem.id })
    .from(itunesMediaItem)
    .where(eq(itunesMediaItem.trackId, itunesData.trackId))
    .get()

  // Map iTunes data to our schema
  const mediaItemData = mapItunesDataToMediaItem(itunesData)

  if (existingItem) {
    // Update existing media item
    db.update(itunesMediaItem)
      .set({
        ...mediaItemData,
        updatedAt: new Date(),
      })
      .where(eq(itunesMediaItem.id, existingItem.id))
      .run()

    return existingItem.id
  } else {
    // Insert new media item
    const result = db
      .insert(itunesMediaItem)
      .values(mediaItemData)
      .returning({ id: itunesMediaItem.id })
      .get()

    return result.id
  }
}

/**
 * Save a price history entry for an iTunes media item
 *
 * @param mediaItemId The ID of the iTunes media item
 * @param itunesData The iTunes track data
 * @returns The ID of the created price history entry
 */
export async function savePriceHistory(
  mediaItemId: string,
  itunesData: any,
): Promise<void> {
  // Map iTunes data to our price history schema
  const priceData = mapItunesDataToPriceHistory(itunesData, mediaItemId)

  // Insert price history
  db.insert(itunesPriceHistory).values(priceData).run()
}
