import { beforeEach, describe, expect, test } from 'bun:test'
import { makeSignature } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/database'
import { passkey, session, user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'
import { createUser } from '@/lib/create-user'
import { resetAuth, seedPasskey } from '../../support/auth'

/**
 * The passkey plugin's own endpoints, reached through the real Better Auth
 * handler and `auth.api`, with real sessions from a password sign-in.
 *
 * `/passkey/delete-passkey` has no freshness check of its own, so these are
 * what proves the `hooks.before` guard in `src/lib/auth.ts` actually runs on
 * both the HTTP route and the server API.
 */

const ORIGIN = new URL(String(auth.options.baseURL)).origin
const PASSWORD = 'geheim-und-lang'

/**
 * A request to the auth handler as the browser client sends it.
 *
 * The preloaded happy-dom `Request` drops `Cookie` and `Origin` passed to its
 * constructor, as a browser would, but keeps them when set afterwards.
 */
function authRequest(
  path: string,
  {
    method = 'GET',
    body,
    cookie,
  }: {
    method?: string
    body?: unknown
    cookie?: string
  } = {},
) {
  const request = new Request(`${ORIGIN}/api/auth${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  request.headers.set('Origin', ORIGIN)
  if (cookie) request.headers.set('Cookie', cookie)

  return auth.handler(request)
}

/**
 * Signs in and returns the session cookie a browser would send back.
 *
 * happy-dom's global `Headers` drops `Set-Cookie` like a browser would, so the
 * cookie is signed here from the returned token with Better Auth's own name,
 * secret and signature (`<token>.<signature>`, URI-encoded) instead of being
 * read off the response.
 */
async function signIn(email: string) {
  const response = await authRequest('/sign-in/email', {
    method: 'POST',
    body: { email, password: PASSWORD },
  })
  expect(response.status).toBe(200)

  const { token } = (await response.json()) as { token: string }
  const context = await auth.$context
  const signature = await makeSignature(token, context.secret)
  const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(
    `${token}.${signature}`,
  )}`

  const userId = db.select().from(user).where(eq(user.email, email)).get()!.id

  return { cookie, userId }
}

/** Backdates the user's sign-in while the session itself stays renewed. */
function signedInMinutesAgo(userId: string, minutes: number) {
  db.update(session)
    .set({
      createdAt: new Date(Date.now() - minutes * 60_000),
      updatedAt: new Date(),
    })
    .where(eq(session.userId, userId))
    .run()
}

const passkeyIds = () =>
  db
    .select({ id: passkey.id })
    .from(passkey)
    .all()
    .map((row) => row.id)

/** POSTs to the catch-all auth route the way the browser client does. */
function deleteOverHttp(id: string, cookie?: string) {
  return authRequest('/passkey/delete-passkey', {
    method: 'POST',
    body: { id },
    cookie,
  })
}

let owner: { cookie: string; userId: string }
let other: { cookie: string; userId: string }

beforeEach(async () => {
  resetAuth()

  await createUser({ email: 'owner@example.com', password: PASSWORD })
  await createUser({ email: 'other@example.com', password: PASSWORD })
  owner = await signIn('owner@example.com')
  other = await signIn('other@example.com')

  seedPasskey('pk-owner', owner.userId)
  seedPasskey('pk-other', other.userId)
})

describe('POST /api/auth/passkey/delete-passkey', () => {
  test('rejects a request without a session', async () => {
    const response = await deleteOverHttp('pk-owner')

    expect(response.status).toBe(401)
    expect(passkeyIds()).toContain('pk-owner')
  })

  test('deletes the user’s own passkey with a fresh session', async () => {
    const response = await deleteOverHttp('pk-owner', owner.cookie)

    expect(response.status).toBe(200)
    expect(passkeyIds()).toEqual(['pk-other'])
  })

  test('refuses a renewed session whose sign-in is too old', async () => {
    signedInMinutesAgo(owner.userId, 6)

    const response = await deleteOverHttp('pk-owner', owner.cookie)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe('SESSION_NOT_FRESH')
    expect(passkeyIds()).toContain('pk-owner')
  })

  test('refuses another user’s passkey even with a fresh session', async () => {
    const response = await deleteOverHttp('pk-other', owner.cookie)

    expect(response.ok).toBe(false)
    expect(passkeyIds()).toContain('pk-other')
  })
})

describe('auth.api.deletePasskey', () => {
  const headersFor = (cookie: string) => new Headers({ Cookie: cookie })

  test('rejects a call without a session', async () => {
    const error = await auth.api
      .deletePasskey({ body: { id: 'pk-owner' }, headers: new Headers() })
      .catch((e: unknown) => e)

    expect(error).toMatchObject({ statusCode: 401 })
    expect(passkeyIds()).toContain('pk-owner')
  })

  test('refuses a stale session', async () => {
    signedInMinutesAgo(owner.userId, 6)

    const error = await auth.api
      .deletePasskey({
        body: { id: 'pk-owner' },
        headers: headersFor(owner.cookie),
      })
      .catch((e: unknown) => e)

    expect(error).toMatchObject({
      statusCode: 403,
      body: { code: 'SESSION_NOT_FRESH' },
    })
    expect(passkeyIds()).toContain('pk-owner')
  })

  test('deletes with a fresh session', async () => {
    const result = await auth.api.deletePasskey({
      body: { id: 'pk-owner' },
      headers: headersFor(owner.cookie),
    })

    expect(result).toEqual({ status: true })
    expect(passkeyIds()).toEqual(['pk-other'])
  })
})

describe('passkey registration', () => {
  const registerOptions = (cookie: string) =>
    authRequest('/passkey/generate-register-options', { cookie })

  test('is offered to a fresh session', async () => {
    expect((await registerOptions(owner.cookie)).status).toBe(200)
  })

  test('refuses a stale session with the shared code', async () => {
    signedInMinutesAgo(owner.userId, 6)

    const response = await registerOptions(owner.cookie)

    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('SESSION_NOT_FRESH')
  })
})
