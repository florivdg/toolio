import { db } from '@/db/database'
import { account, passkey, session, user } from '@/db/schema/auth'

/** Empties the auth tables, children first. */
export function resetAuth(): void {
  db.delete(passkey).run()
  db.delete(session).run()
  db.delete(account).run()
  db.delete(user).run()
}

/** A stored passkey row; the key material is never verified in these tests. */
export function seedPasskey(id: string, userId: string, name = id): void {
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
