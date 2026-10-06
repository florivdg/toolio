import { describe, expect, test } from 'bun:test'
import { SESSION_FRESH_AGE_SECONDS, isSessionFresh } from '@/lib/auth-session'

/**
 * Freshness gates credential changes, so every doubtful input has to come out
 * as stale: a wrong "fresh" lets an old session swap the user's passkeys.
 */

const NOW = Date.parse('2026-10-06T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000)

describe('isSessionFresh', () => {
  test('is a five-minute window', () => {
    expect(SESSION_FRESH_AGE_SECONDS).toBe(300)
  })

  test('accepts a session created just now or within the window', () => {
    expect(isSessionFresh(new Date(NOW), NOW)).toBe(true)
    expect(isSessionFresh(minutesAgo(4.9), NOW)).toBe(true)
  })

  test('rejects a session at or past the window', () => {
    expect(isSessionFresh(minutesAgo(5), NOW)).toBe(false)
    expect(isSessionFresh(minutesAgo(60 * 24), NOW)).toBe(false)
  })

  test('accepts the serialised forms a session can arrive in', () => {
    expect(isSessionFresh(minutesAgo(1).toISOString(), NOW)).toBe(true)
    expect(isSessionFresh(minutesAgo(1).getTime(), NOW)).toBe(true)
  })

  test('treats a missing date as stale', () => {
    expect(isSessionFresh(undefined, NOW)).toBe(false)
    expect(isSessionFresh(null, NOW)).toBe(false)
    expect(isSessionFresh('', NOW)).toBe(false)
  })

  test('treats an unparsable date as stale', () => {
    expect(isSessionFresh('gestern', NOW)).toBe(false)
    expect(isSessionFresh(new Date(Number.NaN), NOW)).toBe(false)
  })

  /** A date in the future would otherwise stay "fresh" until it arrives. */
  test('treats a date in the future as stale', () => {
    expect(isSessionFresh(new Date(NOW + 1000), NOW)).toBe(false)
    expect(isSessionFresh(minutesAgo(-60), NOW)).toBe(false)
  })
})
