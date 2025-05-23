import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import { randomUUID } from 'crypto'

// Table for storing generic iTunes media item information
export const itunesMediaItem = sqliteTable(
  'itunes_media_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    // Core identifier fields (can be trackId or collectionId)
    itunesId: integer('itunes_id').notNull().unique(), // iTunes unique identifier (trackId or collectionId)
    itunesIdType: text('itunes_id_type').notNull(), // 'track' or 'collection'

    // Common fields for all media types
    wrapperType: text('wrapper_type'), // track, collection, etc.
    mediaType: text('media_type'), // movie, tvShow, music, etc.
    entityType: text('entity_type'), // movie, tvSeason, song, etc.

    // Basic information
    name: text('name').notNull(), // The primary name (trackName or collectionName)
    artistName: text('artist_name'),
    censoredName: text('censored_name'),
    viewUrl: text('view_url'), // URL to view in iTunes
    previewUrl: text('preview_url'), // For audio/video previews
    artworkUrl: text('artwork_url'), // Highest quality artwork URL

    // Dates and metadata
    releaseDate: integer('release_date', { mode: 'timestamp' }),
    primaryGenreName: text('primary_genre_name'),
    contentAdvisoryRating: text('content_advisory_rating'), // Age rating
    description: text('description'), // longDescription from the API

    // Locale information
    country: text('country'),
    currency: text('currency'),

    // Additional data stored as JSON string
    additionalData: text('additional_data'), // Store type-specific fields as JSON string

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('itunes_artist_idx').on(table.artistName),
    index('itunes_name_idx').on(table.name),
    index('itunes_media_type_idx').on(table.mediaType),
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

    // Prices (can be for track or collection)
    standardPrice: real('standard_price'), // Regular price
    hdPrice: real('hd_price'), // HD price if available

    // Locale information
    currency: text('currency').notNull(),
    country: text('country').notNull(),

    // Additional price data stored as JSON string
    additionalPriceData: text('additional_price_data'), // Store any additional price data as JSON string

    // Timestamp
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
