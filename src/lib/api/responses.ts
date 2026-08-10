/**
 * JSON response helpers for API routes.
 *
 * Every route returned hand-built `new Response(JSON.stringify(...), { status,
 * headers })` blocks, which meant the Content-Type header and envelope shape
 * were restated at each exit point and could drift apart.
 */

import { z } from 'zod'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

/** Escape hatch for envelopes that do not fit the helpers below. */
export function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

/** 200 with the standard success envelope. */
export function ok(data: unknown, message?: string): Response {
  return json({ success: true, ...(message ? { message } : {}), data }, 200)
}

/** 400 for a request the caller can correct. */
export function badRequest(message: string, errors?: unknown): Response {
  return json({ success: false, message, ...(errors ? { errors } : {}) }, 400)
}

/** 404 for a resource that does not exist or is out of scope for the caller. */
export function notFound(message: string): Response {
  return json({ success: false, message }, 404)
}

/**
 * 500. The `error` field is only emitted when detail is supplied: some routes
 * returned the underlying message to the client and others deliberately did not,
 * so the caller decides rather than this helper normalising the difference.
 */
export function serverError(message: string, error?: unknown): Response {
  return json(
    {
      success: false,
      message,
      ...(error === undefined
        ? {}
        : { error: error instanceof Error ? error.message : String(error) }),
    },
    500,
  )
}

/**
 * Maps a thrown error onto the response routes previously produced inline: 400
 * with the issue list for validation failures, 500 otherwise.
 *
 * `log` and `message` stay separate because routes log in English for developers
 * but answer in German for users. `validationMessage` is separate again because
 * the iTunes routes answer in English throughout.
 */
export function handleApiError(
  error: unknown,
  {
    log,
    message,
    validationMessage = 'Ungültige Anfrageparameter',
    includeErrorDetail = true,
  }: {
    log: string
    message: string
    validationMessage?: string
    includeErrorDetail?: boolean
  },
): Response {
  console.error(`${log}:`, error)

  if (error instanceof z.ZodError) {
    return badRequest(validationMessage, error.issues)
  }

  return serverError(message, includeErrorDetail ? error : undefined)
}
