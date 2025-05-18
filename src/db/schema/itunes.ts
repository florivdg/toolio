import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import { randomUUID } from 'crypto'

// Table for storing basic iTunes media item information
export const itunesMediaItem = sqliteTable(
  'itunes_media_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    trackId: integer('track_id').notNull().unique(), // iTunes unique identifier
    wrapperType: text('wrapper_type'), // track, collection, etc.
    kind: text('kind'), // feature-movie, song, etc.
    artistName: text('artist_name'),
    trackName: text('track_name').notNull(),
    trackCensoredName: text('track_censored_name'),
    trackViewUrl: text('track_view_url'),
    previewUrl: text('preview_url'),
    artworkUrl: text('artwork_url'), // We'll store the highest quality artwork URL
    releaseDate: integer('release_date', { mode: 'timestamp' }),
    primaryGenreName: text('primary_genre_name'),
    description: text('description'), // longDescription from the API
    country: text('country'),
    currency: text('currency'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('itunes_artist_idx').on(table.artistName),
    index('itunes_track_name_idx').on(table.trackName),
  ],
)

// Table for tracking price history
export const itunesPriceHistory = sqliteTable(
  'itunes_price_history',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    mediaItemId: text('media_item_id')
      .notNull()
      .references(() => itunesMediaItem.id, { onDelete: 'cascade' }),
    trackPrice: real('track_price'), // Regular price
    trackHdPrice: real('track_hd_price'), // HD price if available
    collectionPrice: real('collection_price'), // Collection price if part of a collection
    collectionHdPrice: real('collection_hd_price'), // Collection HD price if available
    currency: text('currency').notNull(),
    country: text('country').notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('itunes_price_media_item_idx').on(table.mediaItemId),
    index('itunes_price_recorded_at_idx').on(table.recordedAt),
  ],
)

export const itunesMediaItemSchema = createInsertSchema(itunesMediaItem)
export const itunesPriceHistorySchema = createInsertSchema(itunesPriceHistory)
