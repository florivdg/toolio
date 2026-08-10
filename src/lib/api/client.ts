/**
 * Browser-side helpers for talking to this app's API.
 *
 * Every query and mutation repeated the same two-step unwrap: reject on a
 * non-2xx status, then reject again when the JSON envelope carries
 * `success: false`.
 */

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface Envelope {
  success: boolean
  message?: string
}

async function readEnvelope<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  return (await res.json()) as T
}

/**
 * Returns the whole envelope. Use for responses that carry siblings of `data`,
 * such as a pagination block.
 */
export async function fetchEnvelope<T extends Envelope>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const data = await readEnvelope<T>(input, init)

  if (!data.success) {
    throw new Error(data.message || 'API returned success: false')
  }

  return data
}

/** Returns just the `data` payload. */
export async function fetchData<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  return (await fetchEnvelope<ApiResponse<T>>(input, init)).data
}

/** Request init for a JSON-bodied write. */
export function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
