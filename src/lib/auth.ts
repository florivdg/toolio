import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api'
import { passkey } from '@better-auth/passkey'
import { db } from '@/db/database'
import * as schema from '@/db/schema/auth'
import {
  SESSION_FRESH_AGE_SECONDS,
  SESSION_NOT_FRESH_CODE,
  SESSION_NOT_FRESH_MESSAGE,
  isSessionFresh,
} from '@/lib/auth-session'

/**
 * Passkey endpoints that change a credential, by their Better Auth endpoint
 * path. Registration already carries the library's fresh-session check, but
 * that one lets a missing or future `createdAt` through and deletion has none,
 * so the shared policy is applied to all of them here.
 */
const CREDENTIAL_CHANGE_PATHS = new Set([
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
  '/passkey/delete-passkey',
])

/**
 * Runs for every Better Auth endpoint, whether reached through the HTTP
 * handler or called as `auth.api.*`, before the endpoint's own middleware.
 */
const requireFreshSessionForCredentialChanges = createAuthMiddleware(
  async (ctx) => {
    if (!CREDENTIAL_CHANGE_PATHS.has(ctx.path)) return

    const session = await getSessionFromCtx(ctx)
    if (!session?.session) {
      throw APIError.from('UNAUTHORIZED', {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      })
    }

    if (!isSessionFresh(session.session.createdAt)) {
      throw APIError.from('FORBIDDEN', {
        code: SESSION_NOT_FRESH_CODE,
        message: SESSION_NOT_FRESH_MESSAGE,
      })
    }
  },
)

export const auth = betterAuth({
  baseURL: process.env.PASSKEY_ORIGIN || 'http://localhost:4321',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  session: {
    freshAge: SESSION_FRESH_AGE_SECONDS,
  },
  hooks: {
    before: requireFreshSessionForCredentialChanges,
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    password: {
      async hash(password) {
        return await Bun.password.hash(password)
      },
      async verify(data) {
        return await Bun.password.verify(data.password, data.hash)
      },
    },
  },
  plugins: [
    passkey({
      rpID:
        process.env.NODE_ENV === 'production'
          ? process.env.PASSKEY_RP_ID || 'localhost'
          : 'localhost',
      rpName: 'Toolio',
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.PASSKEY_ORIGIN || 'http://localhost:4321'
          : 'http://localhost:4321',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
      },
    }),
  ],
})
