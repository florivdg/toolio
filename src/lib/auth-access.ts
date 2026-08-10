/**
 * Which paths the auth middleware lets through, and where it sends everyone
 * else.
 *
 * Kept separate from the middleware so the routing decision can be exercised
 * without an Astro request context or a session store.
 */

/**
 * Paths reachable without a session.
 *
 * `/api/itunes/update-prices` is here because the price cron calls it without
 * a browser session.
 */
const PUBLIC_PATHS = [
  '/sign-in',
  '/api/auth',
  '/api/itunes/update-prices',
] as const

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

/** Where to send an unauthenticated visitor, remembering where they wanted. */
export function signInRedirect(pathname: string): string {
  // The home page is the default landing spot anyway, so it needs no parameter.
  if (pathname === '/') return '/sign-in'

  return `/sign-in?redirect=${encodeURIComponent(pathname)}`
}
