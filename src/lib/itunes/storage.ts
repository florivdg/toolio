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
import {
  formatPriceDropMessage,
  hasPriceChanged,
  hasPriceDropped,
} from './price-changes'
import type { NotifiableItem, PriceDropInfo } from './price-changes'
import { sendNotification } from '@/lib/notifications'

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
 * Save or update an iTunes media item in the database
 *
 * @param itunesData The iTunes track data
 * @returns The ID of the saved media item
 */
async function saveItunesMediaItem(itunesData: any): Promise<string> {
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
 * Save a price history entry for an iTunes media item
 * Only saves if the price has changed from the last recorded price
 *
 * @param mediaItemId The ID of the iTunes media item
 * @param itunesData The iTunes track data
 * @returns True if a new price entry was saved, false if price unchanged
 */
async function savePriceHistory(
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

/** A stored media item as the price refresh needs it. */
interface StoredMediaItem extends NotifiableItem {
  id: string
  itunesIdType: string
}

/**
 * Announce a price drop, swallowing notification failures.
 *
 * A broken notification endpoint must not turn a successful price refresh into
 * a reported error.
 */
async function notifyPriceDrop(item: StoredMediaItem, info: PriceDropInfo) {
  try {
    await sendNotification(formatPriceDropMessage(item, info))
  } catch (notificationError) {
    console.error('Failed to send price drop notification:', notificationError)
  }
}

/**
 * Refresh one item's price, notifying if it dropped.
 *
 * @returns Whether a new price history row was written
 * @throws If the item can no longer be found in the iTunes store
 */
async function refreshItemPrice(
  item: StoredMediaItem,
): Promise<'updated' | 'unchanged'> {
  // Always look up against "de", regardless of the country stored on the item.
  const lookupResponse =
    item.itunesIdType === 'collection'
      ? await lookupCollection(item.itunesId, 'de')
      : await lookupTrack(item.itunesId, 'de')

  if (lookupResponse.resultCount === 0) {
    throw new Error('Item not found in iTunes store')
  }

  const itunesData = lookupResponse.results[0]
  const latestPriceHistory = getLatestPriceHistory(item.id)

  // Compare before saving — afterwards the new row would be the latest one.
  if (latestPriceHistory) {
    const priceDropInfo = hasPriceDropped(
      mapItunesDataToPriceHistory(itunesData, item.id),
      latestPriceHistory,
    )

    if (priceDropInfo.dropped) await notifyPriceDrop(item, priceDropInfo)
  }

  return (await savePriceHistory(item.id, itunesData)) ? 'updated' : 'unchanged'
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
  const mediaItems = db
    .select({
      id: itunesMediaItem.id,
      itunesId: itunesMediaItem.itunesId,
      itunesIdType: itunesMediaItem.itunesIdType,
      name: itunesMediaItem.name,
      artistName: itunesMediaItem.artistName,
      viewUrl: itunesMediaItem.viewUrl,
    })
    .from(itunesMediaItem)
    .all()

  let updated = 0
  let unchanged = 0
  const errorDetails: Array<{
    mediaItemId: string
    itunesId: number
    error: string
  }> = []

  // One failing item must not stop the run, so every outcome is collected.
  for (const item of mediaItems) {
    try {
      if ((await refreshItemPrice(item)) === 'updated') updated++
      else unchanged++
    } catch (error) {
      errorDetails.push({
        mediaItemId: item.id,
        itunesId: item.itunesId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    total: mediaItems.length,
    updated,
    unchanged,
    errors: errorDetails.length,
    errorDetails,
  }
}
