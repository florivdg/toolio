/**
 * iTunes data storage utilities
 *
 * This module provides functions to map and store iTunes data in the database.
 */
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { eq, desc } from 'drizzle-orm'
import { lookupTrack, lookupCollection } from './lookup'
import { mapItunesDataToMediaItem, mapItunesDataToPriceHistory } from './mapper'

/**
 * Lookup and store an iTunes item by its ID
 *
 * @param id The iTunes ID to lookup and store
 * @param isCollection Whether the ID is a collection ID
 * @param country The country code (defaults to "de")
 * @returns The mediaItemId
 */
export async function lookupAndStoreItem(
  id: number,
  isCollection: boolean = false,
  country = 'de',
) {
  // Use the lookup function to get iTunes data based on item type
  const lookupResponse = isCollection
    ? await lookupCollection(id, country)
    : await lookupTrack(id, country)

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
 * Lookup and store an iTunes track by its trackId (legacy method)
 *
 * @param trackId The iTunes trackId to lookup and store
 * @param country The country code (defaults to "de")
 * @returns The mediaItemId
 */
export async function lookupAndStoreTrack(trackId: number, country = 'de') {
  return lookupAndStoreItem(trackId, false, country)
}

/**
 * Lookup and store an iTunes collection by its collectionId
 *
 * @param collectionId The iTunes collectionId to lookup and store
 * @param country The country code (defaults to "de")
 * @returns The mediaItemId
 */
export async function lookupAndStoreCollection(
  collectionId: number,
  country = 'de',
) {
  return lookupAndStoreItem(collectionId, true, country)
}

/**
 * Save or update an iTunes media item in the database
 *
 * @param itunesData The iTunes track data
 * @returns The ID of the saved media item
 */
export async function saveItunesMediaItem(itunesData: any): Promise<string> {
  // Map iTunes data to our schema
  const mediaItemData = mapItunesDataToMediaItem(itunesData)

  // Check if the media item already exists based on itunesId and itunesIdType
  const existingItem = db
    .select({ id: itunesMediaItem.id })
    .from(itunesMediaItem)
    .where(eq(itunesMediaItem.itunesId, mediaItemData.itunesId))
    .get()

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
 * Get the latest price history entry for a media item
 *
 * @param mediaItemId The ID of the iTunes media item
 * @returns The latest price history entry or null if none exists
 */
function getLatestPriceHistory(mediaItemId: string) {
  return db
    .select()
    .from(itunesPriceHistory)
    .where(eq(itunesPriceHistory.mediaItemId, mediaItemId))
    .orderBy(desc(itunesPriceHistory.recordedAt))
    .limit(1)
    .get()
}

/**
 * Compare two price data objects to check if prices have changed
 *
 * @param newPriceData The new price data
 * @param latestPriceData The latest stored price data
 * @returns True if prices have changed, false otherwise
 */
function hasPriceChanged(newPriceData: any, latestPriceData: any): boolean {
  // Compare standard prices
  if (newPriceData.standardPrice !== latestPriceData.standardPrice) {
    return true
  }

  // Compare HD prices
  if (newPriceData.hdPrice !== latestPriceData.hdPrice) {
    return true
  }

  // Compare additional price data
  const newAdditionalData = newPriceData.additionalPriceData
    ? JSON.parse(newPriceData.additionalPriceData)
    : {}
  const latestAdditionalData = latestPriceData.additionalPriceData
    ? JSON.parse(latestPriceData.additionalPriceData)
    : {}

  // Compare each price field in additional data
  const allPriceKeys = new Set([
    ...Object.keys(newAdditionalData),
    ...Object.keys(latestAdditionalData),
  ])

  for (const key of allPriceKeys) {
    if (newAdditionalData[key] !== latestAdditionalData[key]) {
      return true
    }
  }

  return false
}

/**
 * Save a price history entry for an iTunes media item
 * Only saves if the price has changed from the last recorded price
 *
 * @param mediaItemId The ID of the iTunes media item
 * @param itunesData The iTunes track data
 * @returns True if a new price entry was saved, false if price unchanged
 */
export async function savePriceHistory(
  mediaItemId: string,
  itunesData: any,
): Promise<boolean> {
  // Map iTunes data to our price history schema
  const newPriceData = mapItunesDataToPriceHistory(itunesData, mediaItemId)

  // Get the latest price history entry
  const latestPriceHistory = getLatestPriceHistory(mediaItemId)

  // If there's no previous price history, always save the first entry
  if (!latestPriceHistory) {
    db.insert(itunesPriceHistory).values(newPriceData).run()
    return true
  }

  // Check if prices have changed
  if (hasPriceChanged(newPriceData, latestPriceHistory)) {
    db.insert(itunesPriceHistory).values(newPriceData).run()
    return true
  }

  // Price hasn't changed, don't save a new entry
  return false
}

/**
 * Update prices for all stored media items
 *
 * This function fetches all stored iTunes media items, looks up their current
 * prices in the iTunes Store, and saves new price history entries only when prices have changed.
 *
 * @returns Summary of the update process including success/error counts
 */
export async function updateAllMediaItemPrices(): Promise<{
  total: number
  updated: number
  unchanged: number
  errors: number
  errorDetails: Array<{ mediaItemId: string; itunesId: number; error: string }>
}> {
  // Get all stored media items
  const mediaItems = db
    .select({
      id: itunesMediaItem.id,
      itunesId: itunesMediaItem.itunesId,
      itunesIdType: itunesMediaItem.itunesIdType,
      country: itunesMediaItem.country,
      name: itunesMediaItem.name,
    })
    .from(itunesMediaItem)
    .all()

  const total = mediaItems.length
  let updated = 0
  let unchanged = 0
  let errors = 0
  const errorDetails: Array<{
    mediaItemId: string
    itunesId: number
    error: string
  }> = []

  // Process each media item
  for (const item of mediaItems) {
    try {
      // Use the appropriate lookup function based on item type
      // Always use "de" as country for lookups, regardless of stored country
      const lookupResponse =
        item.itunesIdType === 'collection'
          ? await lookupCollection(item.itunesId, 'de')
          : await lookupTrack(item.itunesId, 'de')

      if (lookupResponse.resultCount === 0) {
        errors++
        errorDetails.push({
          mediaItemId: item.id,
          itunesId: item.itunesId,
          error: 'Item not found in iTunes store',
        })
        continue
      }

      // Get the first result (should be the item we want)
      const itunesData = lookupResponse.results[0]

      // Save new price history entry only if price changed
      const priceChanged = await savePriceHistory(item.id, itunesData)
      if (priceChanged) {
        updated++
      } else {
        unchanged++
      }
    } catch (error) {
      errors++
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errorDetails.push({
        mediaItemId: item.id,
        itunesId: item.itunesId,
        error: errorMessage,
      })
    }
  }

  return {
    total,
    updated,
    unchanged,
    errors,
    errorDetails,
  }
}
