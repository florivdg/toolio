import { describe, expect, test } from 'bun:test'
import {
  createExclusiveRunner,
  isSchedulerAuthorized,
} from '@/lib/itunes/price-update-guard'

/**
 * The price update endpoint is reachable without a session, so this check is
 * all that stands between an anonymous caller and a full iTunes run.
 */

const SECRET = 'cron-secret-123'

describe('isSchedulerAuthorized', () => {
  test('accepts the configured secret as a bearer token', () => {
    expect(isSchedulerAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(isSchedulerAuthorized(`bearer ${SECRET}`, SECRET)).toBe(true)
  })

  test('rejects a missing or empty header', () => {
    expect(isSchedulerAuthorized(null, SECRET)).toBe(false)
    expect(isSchedulerAuthorized('', SECRET)).toBe(false)
    expect(isSchedulerAuthorized('Bearer ', SECRET)).toBe(false)
  })

  test('rejects a wrong, longer, shorter or differently cased secret', () => {
    expect(isSchedulerAuthorized('Bearer falsch', SECRET)).toBe(false)
    expect(isSchedulerAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(isSchedulerAuthorized(`Bearer ${SECRET.slice(1)}`, SECRET)).toBe(
      false,
    )
    expect(
      isSchedulerAuthorized(`Bearer ${SECRET.toUpperCase()}`, SECRET),
    ).toBe(false)
  })

  test('rejects the secret under another scheme or without one', () => {
    expect(isSchedulerAuthorized(SECRET, SECRET)).toBe(false)
    expect(isSchedulerAuthorized(`Basic ${SECRET}`, SECRET)).toBe(false)
    expect(isSchedulerAuthorized(`Bearer ${SECRET} extra`, SECRET)).toBe(false)
  })

  /** A deployment that forgot the variable must be closed, not open. */
  test('rejects everything when no secret is configured', () => {
    expect(isSchedulerAuthorized('Bearer ', undefined)).toBe(false)
    expect(isSchedulerAuthorized('Bearer undefined', undefined)).toBe(false)
    expect(isSchedulerAuthorized('Bearer x', '')).toBe(false)
    expect(isSchedulerAuthorized('Bearer    ', '   ')).toBe(false)
  })
})

describe('createExclusiveRunner', () => {
  const COOLDOWN = 60_000

  function runner() {
    let time = 1_000_000
    const exclusive = createExclusiveRunner(COOLDOWN, () => time)

    return {
      exclusive,
      advance: (ms: number) => {
        time += ms
      },
    }
  }

  test('runs a task and hands back its result', async () => {
    const { exclusive } = runner()

    expect(await exclusive.run(async () => 42)).toEqual({ value: 42 })
  })

  test('refuses a second run while one is in progress, without starting it', async () => {
    const { exclusive } = runner()
    let release!: () => void
    const first = exclusive.run(
      () => new Promise<void>((resolve) => (release = resolve)),
    )
    let started = false

    const second = await exclusive.run(async () => {
      started = true
    })

    expect(second).toEqual({ refused: 'running' })
    expect(started).toBe(false)
    release()
    await first
  })

  test('refuses another run within the cooldown, then allows it', async () => {
    const { exclusive, advance } = runner()
    await exclusive.run(async () => 'erster')

    advance(COOLDOWN - 1)
    expect(await exclusive.run(async () => 'zu früh')).toEqual({
      refused: 'cooling-down',
    })

    advance(1)
    expect(await exclusive.run(async () => 'zweiter')).toEqual({
      value: 'zweiter',
    })
  })

  test('releases the lock when a task fails', async () => {
    const { exclusive, advance } = runner()

    const failure = await exclusive
      .run(async () => {
        throw new Error('iTunes down')
      })
      .catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(Error)

    // The failure still counts as a run for the cooldown...
    expect(await exclusive.run(async () => 'sofort')).toEqual({
      refused: 'cooling-down',
    })

    // ...but is not left holding the lock.
    advance(COOLDOWN)
    expect(await exclusive.run(async () => 'erholt')).toEqual({
      value: 'erholt',
    })
  })
})
