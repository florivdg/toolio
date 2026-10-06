import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Access control for the price update endpoint, which the cron calls with a
 * bearer secret rather than a browser session.
 */

/** Minimum gap between the starts of two runs. */
export const PRICE_UPDATE_COOLDOWN_MS = 60_000

/**
 * Whether an `Authorization` header carries the scheduler secret.
 *
 * An unset or blank secret rejects everything, so a deployment that forgot to
 * configure it is closed rather than open. Both sides are hashed first so the
 * comparison is constant-time without leaking the secret's length.
 */
export function isSchedulerAuthorized(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret?.trim() || !authorization) return false

  const match = /^Bearer[ ]+(\S+)[ ]*$/i.exec(authorization)
  if (!match) return false

  const digest = (value: string) => createHash('sha256').update(value).digest()

  return timingSafeEqual(digest(match[1]!), digest(secret))
}

/** Why a run was refused before doing any work. */
type RunRefusal = 'running' | 'cooling-down'

/**
 * Lets one task run at a time and no more often than `cooldownMs`.
 *
 * State lives in this process only: with several server processes each would
 * keep its own lock and cooldown.
 */
export function createExclusiveRunner(
  cooldownMs: number,
  now: () => number = Date.now,
) {
  let running = false
  let lastStartedAt = -Infinity

  return {
    async run<T>(
      task: () => Promise<T>,
    ): Promise<{ refused: RunRefusal } | { value: T }> {
      if (running) return { refused: 'running' }
      if (now() - lastStartedAt < cooldownMs) return { refused: 'cooling-down' }

      // Claimed synchronously, before the first await, so a concurrent call
      // cannot slip in between the check and the claim.
      running = true
      lastStartedAt = now()
      try {
        return { value: await task() }
      } finally {
        running = false
      }
    },
  }
}
