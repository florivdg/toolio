import { z } from 'zod'

/**
 * Query parameter schemas shared by the list endpoints.
 */

/**
 * A boolean query parameter.
 *
 * `z.coerce.boolean()` is `Boolean(value)`, so every non-empty string —
 * `'false'` included — becomes true. Two endpoints shipped that inversion, so
 * the literal strings are matched here instead and anything else is rejected.
 */
export const booleanParam = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

/** Standard paging, capped so a caller cannot ask for the whole table. */
export const pagingParams = {
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
} as const
