import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { passkey } from '@better-auth/passkey'
import { db } from '@/db/database'
import * as schema from '@/db/schema/auth'

export const auth = betterAuth({
  baseURL: process.env.PASSKEY_ORIGIN || 'http://localhost:4321',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
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
