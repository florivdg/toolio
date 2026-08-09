import type { APIRoute } from 'astro'

/**
 * Astro route handlers only ever read `params` and `request`, so tests build a
 * minimal context and cast rather than constructing a full APIContext.
 */
export function callRoute(
  route: APIRoute,
  options: { params?: Record<string, string>; body?: unknown; url?: string },
): Promise<Response> {
  const { params = {}, body, url = 'http://localhost/' } = options

  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  return Promise.resolve(
    route({ params, request } as unknown as Parameters<APIRoute>[0]),
  ) as Promise<Response>
}

/** Parse a handler response into status plus decoded JSON body. */
export async function readJson(response: Response) {
  return {
    status: response.status,
    contentType: response.headers.get('Content-Type'),
    body: (await response.json()) as Record<string, any>,
  }
}
