import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  plannedTransactions,
  plannedTransactionSchema,
} from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'

const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const transaction = db
      .select()
      .from(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .get()

    if (!transaction) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Transaktion nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: transaction,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching transaction:', error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ungültige Anfrageparameter',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Laden der Transaktion',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const body = await request.json()
    const validated = plannedTransactionSchema.parse(body)

    const existingTransaction = db
      .select()
      .from(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .get()

    if (!existingTransaction) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Transaktion nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const updatedTransaction = db
      .update(plannedTransactions)
      .set({
        ...validated,
        userId: user!.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaktion erfolgreich aktualisiert',
        data: updatedTransaction,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error updating transaction:', error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ungültige Anfrageparameter',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Aktualisieren der Transaktion',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const deletedTransaction = db
      .delete(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .returning()
      .get()

    if (!deletedTransaction) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Transaktion nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaktion erfolgreich gelöscht',
        deletedId: id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error deleting transaction:', error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ungültige Anfrageparameter',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Löschen der Transaktion',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}

export const PATCH: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const existingTransaction = db
      .select()
      .from(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .get()

    if (!existingTransaction) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Transaktion nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const updatedTransaction = db
      .update(plannedTransactions)
      .set({
        isDone: !existingTransaction.isDone,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plannedTransactions.id, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaktionsstatus erfolgreich geändert',
        data: updatedTransaction,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error toggling transaction status:', error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ungültige Anfrageparameter',
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Ändern des Transaktionsstatus',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
