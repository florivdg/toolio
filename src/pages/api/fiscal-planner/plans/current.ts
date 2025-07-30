import type { APIRoute } from 'astro'
import { db } from '@/db/database'
import { fiscalPlans, plannedTransactions } from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const plan = db
      .select()
      .from(fiscalPlans)
      .where(
        and(
          eq(fiscalPlans.month, currentMonth),
          eq(fiscalPlans.year, currentYear),
          eq(fiscalPlans.isArchived, false),
        ),
      )
      .get()

    if (!plan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Kein Finanzplan für den aktuellen Monat gefunden',
          currentMonth,
          currentYear,
        }),
        {
          status: 404,
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
          eq(plannedTransactions.planId, plan.id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .orderBy(plannedTransactions.dueDate, plannedTransactions.name)
      .all()

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const balance = income - expenses

    const completedCount = transactions.filter((t) => t.isDone).length

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...plan,
          transactions,
          totals: {
            income,
            expenses,
            balance,
            completedCount,
            totalCount: transactions.length,
          },
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
    console.error('Error fetching current fiscal plan:', error)

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Laden des aktuellen Finanzplans',
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
