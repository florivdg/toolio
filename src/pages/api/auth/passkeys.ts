import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { passkey } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'
import { json } from '@/lib/api/responses'

/**
 * This endpoint predates the shared success envelope and answers with bare
 * `{ error }` / `{ passkeys }` objects, which the passkey manager reads.
 */
function unauthorized() {
  return json({ error: 'Unauthorized' }, 401)
}

function failed(log: string, error: unknown) {
  console.error(`${log}:`, error)

  return json({ error: 'Internal server error' }, 500)
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    const session = locals.session
    if (!session) return unauthorized()

    const userPasskeys = await db
      .select({
        id: passkey.id,
        name: passkey.name,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
      })
      .from(passkey)
      .where(eq(passkey.userId, session.userId))
      .orderBy(passkey.createdAt)

    return json({ passkeys: userPasskeys }, 200)
  } catch (error) {
    return failed('Error fetching passkeys', error)
  }
}

export const DELETE: APIRoute = async ({ locals, request }) => {
  try {
    const session = locals.session
    if (!session) return unauthorized()

    const { id } = await request.json()
    if (!id) return json({ error: 'Passkey ID is required' }, 400)

    // Scoped to the session's user, so one account cannot delete another's key.
    const deletedPasskey = await db
      .delete(passkey)
      .where(and(eq(passkey.id, id), eq(passkey.userId, session.userId)))
      .returning()

    if (deletedPasskey.length === 0) {
      return json({ error: 'Passkey not found' }, 404)
    }

    return json({ success: true }, 200)
  } catch (error) {
    return failed('Error deleting passkey', error)
  }
}
