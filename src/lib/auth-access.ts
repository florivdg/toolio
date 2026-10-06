/**
 * Which paths the auth middleware lets through, and where it sends everyone
 * else.
 *
 * Kept separate from the middleware so the routing decision can be exercised
 * without an Astro request context or a session store.
 */

/** Paths reachable without a session. */
const PUBLIC_PATHS = ['/sign-in', '/api/auth'] as const

/**
 * Machine endpoints that authenticate the caller themselves, matched exactly.
 *
 * They are not public: the price cron sends a bearer secret instead of a
 * session cookie, so the middleware hands the request to the route, which
 * rejects it with a JSON 401 unless the secret matches.
 */
const SELF_AUTHENTICATED_PATHS: readonly string[] = [
  '/api/itunes/update-prices',
]

/**
 * Whether a path is public.
 *
 * Matches a public path exactly or as a path segment prefix, so `/api/auth/x`
 * is public while `/api/authorised` is not.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  )
}

/**
 * Whether a visitor without a session is sent to sign in.
 *
 * Self-authenticated routes answer 401 themselves; a sign-in redirect would be
 * meaningless to the cron calling them. They are matched exactly, so nothing
 * below or beside such a route is exempted.
 */
export function requiresSession(pathname: string): boolean {
  return !isPublicPath(pathname) && !SELF_AUTHENTICATED_PATHS.includes(pathname)
}

/** Where to send an unauthenticated visitor, remembering where they wanted. */
export function signInRedirect(pathname: string): string {
  // The home page is the default landing spot anyway, so it needs no parameter.
  if (pathname === '/') return '/sign-in'

  return `/sign-in?redirect=${encodeURIComponent(pathname)}`
}

/**
 * The `redirect` parameter as a same-origin path, or `/` if it is anything
 * else.
 *
 * The parameter comes from the address bar, so a link to
 * `/sign-in?redirect=https://evil.example` must not send a freshly signed-in
 * user off-site, and `javascript:` must never reach `location.href`.
 * Backslashes and control characters are refused outright: browsers rewrite
 * `\` to `/` and drop tabs and newlines, which turns `/\evil.example` into a
 * protocol-relative URL after any check on the raw string.
 *
 * The returned path is checked again on its own: `/a/..//evil.example` and
 * `https://toolio.example//evil.example` parse as same-origin but normalise to
 * the path `//evil.example`, which a browser reads as another host.
 */
export function safeRedirectTarget(
  target: string | null | undefined,
  origin: string,
): string {
  // oxlint-disable-next-line no-control-regex
  if (!target || /[\u0000-\u001f\u007f\\]/.test(target)) return '/'

  try {
    const base = new URL(origin)
    const url = new URL(target, base)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '/'
    if (url.origin !== base.origin) return '/'

    const path = url.pathname + url.search + url.hash

    return new URL(path, base).origin === base.origin ? path : '/'
  } catch {
    return '/'
  }
}
