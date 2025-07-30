import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  transactionTemplates,
  plannedTransactions,
  fiscalPlans,
} from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  planId: z.string().uuid(),
})

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)
    const body = await request.json()
    const { planId } = bodySchema.parse(body)

    const template = db
      .select()
      .from(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, user!.id),
          eq(transactionTemplates.isActive, true),
        ),
      )
      .get()

    if (!template) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Aktive Vorlage nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const plan = db
      .select()
      .from(fiscalPlans)
      .where(eq(fiscalPlans.id, planId))
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

    let shouldApply = false
    const planMonth = plan.month

    switch (template.recurrenceType) {
      case 'monthly':
        shouldApply = true
        break
      case 'yearly':
        const yearlyMonth = template.dayOfMonth
          ? Math.floor(template.dayOfMonth / 100)
          : planMonth
        shouldApply = planMonth === yearlyMonth
        break
      case 'specific_months':
        if (template.specificMonths) {
          const months = JSON.parse(template.specificMonths)
          shouldApply = months.includes(planMonth)
        }
        break
    }

    if (!shouldApply) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Diese Vorlage ist für den gewählten Monat nicht anwendbar',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const existingTransaction = db
      .select()
      .from(plannedTransactions)
      .where(
        and(
          eq(plannedTransactions.planId, planId),
          eq(plannedTransactions.templateId, id),
          eq(plannedTransactions.userId, user!.id),
        ),
      )
      .get()

    if (existingTransaction) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Diese Vorlage wurde bereits für diesen Finanzplan angewendet',
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    let dayOfMonth = template.dayOfMonth || 15
    if (template.recurrenceType === 'yearly' && template.dayOfMonth) {
      dayOfMonth = template.dayOfMonth % 100
    }

    const lastDayOfMonth = new Date(plan.year, plan.month, 0).getDate()
    if (dayOfMonth > lastDayOfMonth) {
      dayOfMonth = lastDayOfMonth
    }

    const dueDate = new Date(plan.year, plan.month - 1, dayOfMonth)

    const newTransaction = db
      .insert(plannedTransactions)
      .values({
        id: randomUUID(),
        userId: user!.id,
        planId: planId,
        templateId: id,
        name: template.name,
        amount: template.amount,
        dueDate: dueDate,
        type: template.type,
        categoryId: template.categoryId,
        isDone: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vorlage erfolgreich angewendet',
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
    console.error('Error applying template:', error)

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
        message: 'Fehler beim Anwenden der Vorlage',
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
