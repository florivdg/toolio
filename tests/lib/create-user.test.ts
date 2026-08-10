import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { account, user } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import { createUser } from '@/lib/create-user'

/**
 * A user needs both rows: the user record and the credential account holding
 * the password hash. One without the other is an account nobody can sign in to.
 */

function accountFor(userId: string) {
  return db.select().from(account).where(eq(account.userId, userId)).get()
}

beforeEach(() => {
  db.delete(account).run()
  db.delete(user).run()
})

describe('createUser', () => {
  test('creates the user and its credential account', async () => {
    const { userId } = await createUser({
      email: 'flori@example.com',
      password: 'geheim',
      name: 'Flori',
    })

    const created = db.select().from(user).where(eq(user.id, userId)).get()
    expect(created?.email).toBe('flori@example.com')
    expect(created?.name).toBe('Flori')
    expect(created?.emailVerified).toBe(true)

    expect(accountFor(userId)?.providerId).toBe('credential')
  })

  test('names the user after the local part when no name is given', async () => {
    const { userId } = await createUser({
      email: 'flori@example.com',
      password: 'geheim',
    })

    expect(db.select().from(user).where(eq(user.id, userId)).get()?.name).toBe(
      'flori',
    )
  })

  test('stores a verifiable hash rather than the password', async () => {
    const { userId } = await createUser({
      email: 'flori@example.com',
      password: 'geheim',
    })
    const stored = accountFor(userId)!.password!

    expect(stored).not.toBe('geheim')
    expect(await Bun.password.verify('geheim', stored)).toBe(true)
    expect(await Bun.password.verify('falsch', stored)).toBe(false)
  })

  test('gives each user a distinct id', async () => {
    const first = await createUser({ email: 'a@example.com', password: 'x' })
    const second = await createUser({ email: 'b@example.com', password: 'x' })

    expect(first.userId).not.toBe(second.userId)
  })

  test('refuses a duplicate email', async () => {
    await createUser({ email: 'flori@example.com', password: 'geheim' })

    expect(
      createUser({ email: 'flori@example.com', password: 'anders' }),
    ).rejects.toThrow()
  })
})
