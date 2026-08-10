import { db } from '@/db/database'
import { user, account } from '@/db/schema/auth'

/**
 * Create a credential user.
 *
 * Extracted from scripts/add-user.ts so the two inserts — which must both
 * happen or a user exists that can never sign in — can be exercised.
 */
export async function createUser({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name?: string
}): Promise<{ userId: string }> {
  const userId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  const now = new Date()

  await db.insert(user).values({
    id: userId,
    email,
    // Without a name the local part of the address is a reasonable display name.
    name: name ?? email.split('@')[0]!,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(account).values({
    id: accountId,
    accountId,
    providerId: 'credential',
    userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: await Bun.password.hash(password),
    createdAt: now,
    updatedAt: now,
  })

  return { userId }
}
