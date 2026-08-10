/**
 * Types for iTunes watchlist functionality
 */
import type { InferSelectModel } from 'drizzle-orm'
import { itunesMediaItem } from '@/db/schema/itunes'
import { ARTWORK_PLACEHOLDER, formatPrice, optimizeArtworkUrl } from './helpers'

// Infer the WatchlistItem type from the Drizzle schema
export type WatchlistItem = InferSelectModel<typeof itunesMediaItem>

// API response types
export interface WatchlistResponse {
  success: boolean
  data: WatchlistItem[]
  count: number
  offset: number
  limit: number
}

export interface RemoveItemResponse {
  success: boolean
  message: string
  removedItemId?: string
  error?: string
  errors?: any[]
}

// Helper interface for parsed additional data
export interface ParsedWatchlistItem extends Omit<
  WatchlistItem,
  'additionalData'
> {
  additionalData?: Record<string, any>
}

/**
 * Decode the additionalData blob a stored item carries.
 *
 * The list endpoint decodes it, but items coming from elsewhere still hold the
 * raw string, so both shapes have to be accepted.
 */
export function parseWatchlistItem(item: WatchlistItem): ParsedWatchlistItem {
  if (!item.additionalData) return { ...item, additionalData: undefined }

  if (typeof item.additionalData !== 'string') {
    return { ...item, additionalData: item.additionalData }
  }

  try {
    return { ...item, additionalData: JSON.parse(item.additionalData) }
  } catch {
    // A corrupt blob costs the extras on one card, not the whole watchlist.
    return { ...item, additionalData: undefined }
  }
}

/** German labels for the entity types the watchlist stores. */
const ENTITY_LABELS: Record<string, string> = {
  song: 'Titel',
  album: 'Album',
  artist: 'Künstler',
  podcast: 'Podcast',
  audiobook: 'Hörbuch',
  'music-video': 'Musikvideo',
  'tv-episode': 'TV-Folge',
  'tv-season': 'TV-Staffel',
  'feature-movie': 'Film',
  movie: 'Film',
  software: 'App',
  ebook: 'Buch',
}

/** German labels for the wrapper types, used when no entity type is stored. */
const WRAPPER_LABELS: Record<string, string> = {
  track: 'Titel',
  collection: 'Sammlung',
  artist: 'Künstler',
}

/**
 * The label shown on a watchlist card.
 *
 * Falls back through entity type, wrapper type and media type rather than
 * showing nothing, since an unlabelled card gives no hint what it is.
 */
export function getMediaTypeLabel(item: ParsedWatchlistItem): string {
  if (item.entityType) {
    return ENTITY_LABELS[item.entityType] ?? item.entityType
  }

  if (item.wrapperType && WRAPPER_LABELS[item.wrapperType]) {
    return WRAPPER_LABELS[item.wrapperType]!
  }

  return item.mediaType || 'Medien'
}

/**
 * Artwork for a watchlist item, falling back to whatever additionalData kept.
 *
 * Items stored before artworkUrl was captured only carry the sized variants in
 * their additional data.
 */
export function getWatchlistArtworkUrl(item: ParsedWatchlistItem): string {
  const extra = item.additionalData
  const baseUrl =
    item.artworkUrl ||
    extra?.artworkUrl600 ||
    extra?.artworkUrl512 ||
    extra?.artworkUrl300 ||
    extra?.artworkUrl100 ||
    extra?.artworkUrl60 ||
    extra?.artworkUrl30

  return baseUrl ? optimizeArtworkUrl(baseUrl) : ARTWORK_PLACEHOLDER
}

/**
 * The most relevant price recorded for a watchlist item, HD first.
 *
 * @returns The formatted price, or null when none was recorded
 */
export function getLatestPrice(item: ParsedWatchlistItem): string | null {
  const extra = item.additionalData

  const price =
    extra?.trackHdPrice ||
    extra?.collectionHdPrice ||
    extra?.trackPrice ||
    extra?.collectionPrice

  return price && item.currency ? formatPrice(price, item.currency) : null
}
