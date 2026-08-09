/**
 * JSON response helpers for API routes.
 *
 * Every route returned hand-built `new Response(JSON.stringify(...), { status,
 * headers })` blocks, which meant the Content-Type header and envelope shape
 * were restated at each exit point and could drift apart.
 */

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
  return json(
    { success: false, message, ...(errors ? { errors } : {}) },
    400,
  )
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
