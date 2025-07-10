import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { passkey } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check if user is authenticated
    const session = locals.session
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch user's passkeys from database
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

    return new Response(JSON.stringify({ passkeys: userPasskeys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching passkeys:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const DELETE: APIRoute = async ({ locals, request }) => {
  try {
    // Check if user is authenticated
    const session = locals.session
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get passkey ID from request body
    const { id } = await request.json()
    if (!id) {
      return new Response(JSON.stringify({ error: 'Passkey ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Delete the passkey (only if it belongs to the current user)
    const deletedPasskey = await db
      .delete(passkey)
      .where(and(eq(passkey.id, id), eq(passkey.userId, session.userId)))
      .returning()

    if (deletedPasskey.length === 0) {
      return new Response(JSON.stringify({ error: 'Passkey not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting passkey:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
