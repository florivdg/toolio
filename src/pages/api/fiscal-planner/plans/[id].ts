import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  fiscalPlans,
  plannedTransactions,
  fiscalPlanSchema,
} from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'

const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const plan = db
      .select()
      .from(fiscalPlans)
      .where(eq(fiscalPlans.id, id))
      .get()

    if (!plan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Finanzplan nicht gefunden',
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
          eq(plannedTransactions.planId, id),
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
    console.error('Error fetching fiscal plan:', error)

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
        message: 'Fehler beim Laden des Finanzplans',
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

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = pathParamsSchema.parse(params)

    const body = await request.json()
    const validated = fiscalPlanSchema.parse(body)

    const existingPlan = db
      .select()
      .from(fiscalPlans)
      .where(eq(fiscalPlans.id, id))
      .get()

    if (!existingPlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Finanzplan nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    if (
      existingPlan.month !== validated.month ||
      existingPlan.year !== validated.year
    ) {
      const duplicatePlan = db
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

      if (duplicatePlan && duplicatePlan.id !== id) {
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
    }

    const updatedPlan = db
      .update(fiscalPlans)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(fiscalPlans.id, id))
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Finanzplan erfolgreich aktualisiert',
        data: updatedPlan,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error updating fiscal plan:', error)

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
        message: 'Fehler beim Aktualisieren des Finanzplans',
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

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = pathParamsSchema.parse(params)

    const deletedPlan = db
      .delete(fiscalPlans)
      .where(eq(fiscalPlans.id, id))
      .returning()
      .get()

    if (!deletedPlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Finanzplan nicht gefunden',
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
        message: 'Finanzplan erfolgreich gelöscht',
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
    console.error('Error deleting fiscal plan:', error)

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
        message: 'Fehler beim Löschen des Finanzplans',
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
