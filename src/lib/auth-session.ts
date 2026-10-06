/**
 * Session freshness: how recently the user must have actually signed in to
 * change their credentials.
 *
 * Shared by the Better Auth config, its passkey hook and the custom passkey
 * route, so it must not import `@/lib/auth` (that module imports this one).
 */

/** Five minutes, in seconds as Better Auth's `session.freshAge` expects. */
export const SESSION_FRESH_AGE_SECONDS = 5 * 60

/** Stable code the UI keys its "sign in again" prompt on. */
export const SESSION_NOT_FRESH_CODE = 'SESSION_NOT_FRESH'

export const SESSION_NOT_FRESH_MESSAGE =
  'Bitte melden Sie sich erneut an, um Ihre Passkeys zu ändern.'

/**
 * Whether a session was created within the fresh window.
 *
 * Measured from `createdAt`, the sign-in time. `updatedAt` moves whenever the
 * session is renewed, so it says nothing about when the password or passkey
 * was last presented. A missing, unparsable or future timestamp counts as
 * stale rather than fresh.
 */
export function isSessionFresh(
  createdAt: Date | string | number | null | undefined,
  now: number = Date.now(),
): boolean {
  // `new Date(null)` is the epoch rather than invalid, so it is caught here.
  if (createdAt == null) return false

  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return false

  const age = now - created

  return age >= 0 && age < SESSION_FRESH_AGE_SECONDS * 1000
}
