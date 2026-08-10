import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { passkey, user } from '@/db/schema/auth'
import {
  DELETE as deletePasskey,
  GET as listPasskeys,
} from '@/pages/api/auth/passkeys'
import { callRoute, readJson } from '../../support/route'

/**
 * Every query here is scoped to the session's user. That scoping is the whole
 * security property of the endpoint, so it is what these tests aim at.
 */

const OWNER = 'user-1'
const OTHER = 'user-2'

function seedUser(id: string) {
  db.insert(user)
    .values({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
}

function seedPasskey(id: string, userId: string, name = id) {
  db.insert(passkey)
    .values({
      id,
      name,
      publicKey: 'pk',
      userId,
      credentialID: `cred-${id}`,
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
      createdAt: new Date(),
    })
    .run()
}

/** A session context as the auth middleware would populate it. */
function asUser(userId: string) {
  return { session: { userId } }
}

beforeEach(() => {
  db.delete(passkey).run()
  db.delete(user).run()
  seedUser(OWNER)
  seedUser(OTHER)
})

describe('GET /api/auth/passkeys', () => {
  test('rejects an unauthenticated request', async () => {
    const { status, body } = await readJson(
      await callRoute(listPasskeys, { locals: {} }),
    )

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns only the signed-in user’s passkeys', async () => {
    seedPasskey('pk-1', OWNER, 'MacBook')
    seedPasskey('pk-2', OTHER, 'Fremdes Gerät')

    const { status, body } = await readJson(
      await callRoute(listPasskeys, { locals: asUser(OWNER) }),
    )

    expect(status).toBe(200)
    expect(body.passkeys).toHaveLength(1)
    expect(body.passkeys[0].name).toBe('MacBook')
  })

  test('returns an empty list rather than failing when there are none', async () => {
    const { status, body } = await readJson(
      await callRoute(listPasskeys, { locals: asUser(OWNER) }),
    )

    expect(status).toBe(200)
    expect(body.passkeys).toEqual([])
  })

  test('does not expose the public key or credential id', async () => {
    seedPasskey('pk-1', OWNER)

    const { body } = await readJson(
      await callRoute(listPasskeys, { locals: asUser(OWNER) }),
    )

    expect(body.passkeys[0]).not.toHaveProperty('publicKey')
    expect(body.passkeys[0]).not.toHaveProperty('credentialID')
  })
})

describe('DELETE /api/auth/passkeys', () => {
  test('rejects an unauthenticated request', async () => {
    const { status } = await readJson(
      await callRoute(deletePasskey, { locals: {}, body: { id: 'pk-1' } }),
    )

    expect(status).toBe(401)
  })

  test('requires an id', async () => {
    const { status, body } = await readJson(
      await callRoute(deletePasskey, { locals: asUser(OWNER), body: {} }),
    )

    expect(status).toBe(400)
    expect(body.error).toBe('Passkey ID is required')
  })

  test('deletes the user’s own passkey', async () => {
    seedPasskey('pk-1', OWNER)

    const { status, body } = await readJson(
      await callRoute(deletePasskey, {
        locals: asUser(OWNER),
        body: { id: 'pk-1' },
      }),
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(db.select().from(passkey).all()).toHaveLength(0)
  })

  test('refuses to delete another user’s passkey', async () => {
    seedPasskey('pk-2', OTHER)

    const { status, body } = await readJson(
      await callRoute(deletePasskey, {
        locals: asUser(OWNER),
        body: { id: 'pk-2' },
      }),
    )

    expect(status).toBe(404)
    expect(body.error).toBe('Passkey not found')
    // Still there: a 404 must not be a successful cross-account delete.
    expect(db.select().from(passkey).all()).toHaveLength(1)
  })

  test('answers 404 for an id that does not exist', async () => {
    const { status } = await readJson(
      await callRoute(deletePasskey, {
        locals: asUser(OWNER),
        body: { id: 'pk-missing' },
      }),
    )

    expect(status).toBe(404)
  })
})
