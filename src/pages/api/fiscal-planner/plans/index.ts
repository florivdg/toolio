import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  fiscalPlans,
  plannedTransactions,
  fiscalPlanSchema,
} from '@/db/schema/fiscal-planner'
import { desc, eq, and, count } from 'drizzle-orm'

const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  year: z.coerce.number().min(2000).max(2100).optional(),
  includeArchived: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
})

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user

    const params = Object.fromEntries(url.searchParams.entries())
    const { limit, offset, year, includeArchived } =
      queryParamsSchema.parse(params)

    const whereConditions = []
    if (year) {
      whereConditions.push(eq(fiscalPlans.year, year))
    }
    if (!includeArchived) {
      whereConditions.push(eq(fiscalPlans.isArchived, false))
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined

    const plansData = db
      .select({
        id: fiscalPlans.id,
        month: fiscalPlans.month,
        year: fiscalPlans.year,
        notes: fiscalPlans.notes,
        isArchived: fiscalPlans.isArchived,
        createdAt: fiscalPlans.createdAt,
        updatedAt: fiscalPlans.updatedAt,
        transactionCount: count(plannedTransactions.id),
      })
      .from(fiscalPlans)
      .leftJoin(
        plannedTransactions,
        eq(fiscalPlans.id, plannedTransactions.planId),
      )
      .where(whereClause)
      .groupBy(fiscalPlans.id)
      .orderBy(desc(fiscalPlans.year), desc(fiscalPlans.month))
      .limit(limit)
      .offset(offset)
      .all()

    const plansWithTotals = plansData.map((plan) => {
      const transactions = db
        .select({
          amount: plannedTransactions.amount,
          type: plannedTransactions.type,
          isDone: plannedTransactions.isDone,
        })
        .from(plannedTransactions)
        .where(
          and(
            eq(plannedTransactions.planId, plan.id),
            eq(plannedTransactions.userId, user!.id),
          ),
        )
        .all()

      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const balance = income - expenses

      const completedCount = transactions.filter((t) => t.isDone).length

      return {
        ...plan,
        totals: {
          income,
          expenses,
          balance,
          completedCount,
          totalCount: transactions.length,
        },
      }
    })

    const countResult = db
      .select({ count: count() })
      .from(fiscalPlans)
      .where(whereClause)
      .get()
    const totalCount = countResult?.count ?? 0

    return new Response(
      JSON.stringify({
        success: true,
        data: plansWithTotals,
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
    console.error('Error fetching fiscal plans:', error)

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
        message: 'Fehler beim Laden der Finanzpläne',
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const validated = fiscalPlanSchema.parse(body)

    const existingPlan = db
      .select()
      .from(fiscalPlans)
      .where(
        and(
          eq(fiscalPlans.month, validated.month),
          eq(fiscalPlans.year, validated.year),
          eq(fiscalPlans.isArchived, false),
        ),
      )
      .get()

    if (existingPlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Es existiert bereits ein aktiver Finanzplan für diesen Monat',
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const newPlan = db
      .insert(fiscalPlans)
      .values({
        ...validated,
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Finanzplan erfolgreich erstellt',
        data: newPlan,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error creating fiscal plan:', error)

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
        message: 'Fehler beim Erstellen des Finanzplans',
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
