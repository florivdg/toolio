/**
 * Types for iTunes watchlist functionality
 */
import type { InferSelectModel } from 'drizzle-orm'
import { itunesMediaItem } from '@/db/schema/itunes'

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
export interface ParsedWatchlistItem
  extends Omit<WatchlistItem, 'additionalData'> {
  additionalData?: Record<string, any>
}
