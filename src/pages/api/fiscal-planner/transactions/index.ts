import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  plannedTransactions,
  plannedTransactionSchema,
} from '@/db/schema/fiscal-planner'
import { desc, eq, and, gte, lte, count } from 'drizzle-orm'

const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  planId: z.string().uuid().optional(),
  type: z.enum(['income', 'expense']).optional(),
  isDone: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user

    const params = Object.fromEntries(url.searchParams.entries())
    const { limit, offset, planId, type, isDone, startDate, endDate } =
      queryParamsSchema.parse(params)

    const whereConditions = [eq(plannedTransactions.userId, user!.id)]

    if (planId) {
      whereConditions.push(eq(plannedTransactions.planId, planId))
    }
    if (type) {
      whereConditions.push(eq(plannedTransactions.type, type))
    }
    if (isDone !== undefined) {
      whereConditions.push(eq(plannedTransactions.isDone, isDone))
    }
    if (startDate) {
      whereConditions.push(gte(plannedTransactions.dueDate, startDate))
    }
    if (endDate) {
      whereConditions.push(lte(plannedTransactions.dueDate, endDate))
    }

    const whereClause = and(...whereConditions)

    const transactions = db
      .select()
      .from(plannedTransactions)
      .where(whereClause)
      .orderBy(
        desc(plannedTransactions.dueDate),
        desc(plannedTransactions.createdAt),
      )
      .limit(limit)
      .offset(offset)
      .all()

    const countResult = db
      .select({ count: count() })
      .from(plannedTransactions)
      .where(whereClause)
      .get()
    const totalCount = countResult?.count ?? 0

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const totals = {
      income,
      expenses,
      balance: income - expenses,
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: transactions,
        totals,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching transactions:', error)

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
        message: 'Fehler beim Laden der Transaktionen',
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

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user

    const body = await request.json()
    const validated = plannedTransactionSchema.parse(body)

    const newTransaction = db
      .insert(plannedTransactions)
      .values({
        ...validated,
        userId: user!.id,
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaktion erfolgreich erstellt',
        data: newTransaction,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error creating transaction:', error)

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
        message: 'Fehler beim Erstellen der Transaktion',
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
