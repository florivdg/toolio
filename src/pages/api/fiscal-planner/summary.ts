import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import { fiscalPlans, plannedTransactions } from '@/db/schema/fiscal-planner'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

const queryParamsSchema = z.object({
  year: z.coerce.number().min(2000).max(2100).optional(),
  startMonth: z.coerce.number().min(1).max(12).optional(),
  endMonth: z.coerce.number().min(1).max(12).optional(),
})

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user

    const params = Object.fromEntries(url.searchParams.entries())
    const now = new Date()
    const {
      year = now.getFullYear(),
      startMonth = 1,
      endMonth = 12,
    } = queryParamsSchema.parse(params)

    const plansInRange = db
      .select()
      .from(fiscalPlans)
      .where(
        and(
          eq(fiscalPlans.year, year),
          gte(fiscalPlans.month, startMonth),
          lte(fiscalPlans.month, endMonth),
          eq(fiscalPlans.isArchived, false),
        ),
      )
      .all()

    const planIds = plansInRange.map((p) => p.id)

    if (planIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            year,
            startMonth,
            endMonth,
            totalIncome: 0,
            totalExpenses: 0,
            totalBalance: 0,
            completedIncome: 0,
            completedExpenses: 0,
            completedBalance: 0,
            monthlyBreakdown: [],
            categoryBreakdown: [],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const transactions = db
      .select()
      .from(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.userId, user!.id),
          sql`${plannedTransactions.planId} IN ${planIds}`,
        ),
      )
      .all()

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const completedIncome = transactions
      .filter((t) => t.type === 'income' && t.isDone)
      .reduce((sum, t) => sum + t.amount, 0)

    const completedExpenses = transactions
      .filter((t) => t.type === 'expense' && t.isDone)
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyBreakdown = plansInRange.map((plan) => {
      const planTransactions = transactions.filter((t) => t.planId === plan.id)

      const income = planTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = planTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const completedCount = planTransactions.filter((t) => t.isDone).length

      return {
        month: plan.month,
        year: plan.year,
        income,
        expenses,
        balance: income - expenses,
        completedCount,
        totalCount: planTransactions.length,
      }
    })

    const categoryGroups = new Map()
    transactions.forEach((t) => {
      const categoryId = t.categoryId || 'uncategorized'
      if (!categoryGroups.has(categoryId)) {
        categoryGroups.set(categoryId, {
          categoryId,
          income: 0,
          expenses: 0,
          transactionCount: 0,
        })
      }
      const group = categoryGroups.get(categoryId)
      if (t.type === 'income') {
        group.income += t.amount
      } else {
        group.expenses += t.amount
      }
      group.transactionCount++
    })

    const categoryBreakdown = Array.from(categoryGroups.values()).sort(
      (a, b) => b.expenses + b.income - (a.expenses + a.income),
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          year,
          startMonth,
          endMonth,
          totalIncome,
          totalExpenses,
          totalBalance: totalIncome - totalExpenses,
          completedIncome,
          completedExpenses,
          completedBalance: completedIncome - completedExpenses,
          completionRate:
            transactions.length > 0
              ? Math.round(
                  (transactions.filter((t) => t.isDone).length /
                    transactions.length) *
                    100,
                )
              : 0,
          monthlyBreakdown,
          categoryBreakdown,
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
    console.error('Error generating fiscal summary:', error)

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
        message: 'Fehler beim Generieren der Finanzübersicht',
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
