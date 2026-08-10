import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { desc, and, sql, SQL } from 'drizzle-orm'
import { z } from 'zod'
import { handleApiError, json } from '@/lib/api/responses'
import { booleanParam, pagingParams } from '@/lib/api/query-params'

// Define query parameters schema
const queryParamsSchema = z.object({
  ...pagingParams,
  artistName: z.string().optional(),
  name: z.string().optional(),
  genreName: z.string().optional(),
  mediaType: z.string().optional(),
  entityType: z.string().optional(),
  withPrices: booleanParam.default(false),
})

type QueryParams = z.infer<typeof queryParamsSchema>

/** The text filters, each matched case-insensitively as a substring. */
const TEXT_FILTERS = [
  ['artistName', itunesMediaItem.artistName],
  ['name', itunesMediaItem.name],
  ['genreName', itunesMediaItem.primaryGenreName],
  ['mediaType', itunesMediaItem.mediaType],
  ['entityType', itunesMediaItem.entityType],
] as const

function buildFilters(params: QueryParams): SQL[] {
  const conditions: SQL[] = []

  for (const [key, column] of TEXT_FILTERS) {
    const value = params[key]
    if (value) {
      conditions.push(sql`lower(${column}) like lower(${'%' + value + '%'})`)
    }
  }

  return conditions
}

/**
 * Decode a JSON column, keeping the raw string when it cannot be parsed.
 *
 * A single corrupt row should degrade that one field rather than fail the whole
 * listing, which is why this logs and carries on.
 */
function parseJsonColumn<T extends Record<string, any>, K extends keyof T>(
  row: T,
  key: K,
  label: string,
): T {
  const raw = row[key]
  if (!raw) return { ...row }

  try {
    return { ...row, [key]: JSON.parse(raw as string) }
  } catch (e) {
    console.error(`Failed to parse ${String(key)} for ${label}:`, e)
    return { ...row }
  }
}

/** Every stored price row for the given items, newest first, grouped by item. */
function pricesByMediaItem(mediaItemIds: string[]) {
  const priceHistories = db
    .select()
    .from(itunesPriceHistory)
    .where(sql`${itunesPriceHistory.mediaItemId} IN ${mediaItemIds}`)
    .orderBy(desc(itunesPriceHistory.recordedAt))
    .all()

  const grouped = new Map<string, Record<string, any>[]>()

  for (const price of priceHistories) {
    const parsed = parseJsonColumn(
      price,
      'additionalPriceData',
      `price ${price.id}`,
    )
    const existing = grouped.get(price.mediaItemId)

    if (existing) existing.push(parsed)
    else grouped.set(price.mediaItemId, [parsed])
  }

  return grouped
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = Object.fromEntries(url.searchParams.entries())
    const validated = queryParamsSchema.parse(params)
    const whereConditions = buildFilters(validated)

    const mediaItems = db
      .select()
      .from(itunesMediaItem)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(itunesMediaItem.createdAt))
      .limit(validated.limit)
      .offset(validated.offset)
      .all()

    const parsedItems = mediaItems.map((item) =>
      parseJsonColumn(item, 'additionalData', `item ${item.id}`),
    )

    // The price join is only worth a second query when the caller asked for it
    // and there is at least one item to join against.
    const prices =
      validated.withPrices && parsedItems.length > 0
        ? pricesByMediaItem(mediaItems.map((item) => item.id))
        : null

    const data = prices
      ? parsedItems.map((item) => ({
          ...item,
          prices: prices.get(item.id) ?? [],
        }))
      : parsedItems

    return json(
      {
        success: true,
        data,
        count: data.length,
        offset: validated.offset,
        limit: validated.limit,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error, {
      log: 'Error retrieving iTunes media items',
      message: 'Failed to retrieve media items',
      validationMessage: 'Invalid query parameters',
    })
  }
}
