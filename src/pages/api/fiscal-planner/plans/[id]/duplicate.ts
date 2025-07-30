import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  fiscalPlans,
  plannedTransactions,
  transactionTemplates,
} from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  targetMonth: z.number().min(1).max(12),
  targetYear: z.number().min(2000).max(2100),
  includeTransactions: z.boolean().default(true),
  applyTemplates: z.boolean().default(true),
})

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)
    const body = await request.json()
    const { targetMonth, targetYear, includeTransactions, applyTemplates } =
      bodySchema.parse(body)

    const sourcePlan = db
      .select()
      .from(fiscalPlans)
      .where(eq(fiscalPlans.id, id))
      .get()

    if (!sourcePlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Quell-Finanzplan nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const existingPlan = db
      .select()
      .from(fiscalPlans)
      .where(
        and(
          eq(fiscalPlans.month, targetMonth),
          eq(fiscalPlans.year, targetYear),
          eq(fiscalPlans.isArchived, false),
        ),
      )
      .get()

    if (existingPlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Es existiert bereits ein aktiver Finanzplan für den Zielmonat',
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const newPlanId = randomUUID()
    const newPlan = db
      .insert(fiscalPlans)
      .values({
        id: newPlanId,
        month: targetMonth,
        year: targetYear,
        notes: sourcePlan.notes
          ? `Kopiert von ${sourcePlan.month}/${sourcePlan.year}. ${sourcePlan.notes}`
          : `Kopiert von ${sourcePlan.month}/${sourcePlan.year}`,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .get()

    const createdTransactions = []

    if (includeTransactions) {
      const sourceTransactions = db
        .select()
        .from(plannedTransactions)
        .where(
          and(
            eq(plannedTransactions.planId, id),
            eq(plannedTransactions.userId, user!.id),
          ),
        )
        .all()

      for (const transaction of sourceTransactions) {
        const dayOfMonth = transaction.dueDate.getDate()
        const lastDayOfTargetMonth = new Date(
          targetYear,
          targetMonth,
          0,
        ).getDate()
        const adjustedDay = Math.min(dayOfMonth, lastDayOfTargetMonth)
        const newDueDate = new Date(targetYear, targetMonth - 1, adjustedDay)

        const newTransaction = db
          .insert(plannedTransactions)
          .values({
            id: randomUUID(),
            userId: user!.id,
            planId: newPlanId,
            templateId: transaction.templateId,
            name: transaction.name,
            amount: transaction.amount,
            dueDate: newDueDate,
            type: transaction.type,
            isDone: false,
            categoryId: transaction.categoryId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
          .get()

        createdTransactions.push(newTransaction)
      }
    }

    if (applyTemplates) {
      const activeTemplates = db
        .select()
        .from(transactionTemplates)
        .where(
          and(
            eq(transactionTemplates.userId, user!.id),
            eq(transactionTemplates.isActive, true),
          ),
        )
        .all()

      for (const template of activeTemplates) {
        let shouldApply = false

        switch (template.recurrenceType) {
          case 'monthly':
            shouldApply = true
            break
          case 'yearly':
            const yearlyMonth = template.dayOfMonth
              ? Math.floor(template.dayOfMonth / 100)
              : targetMonth
            shouldApply = targetMonth === yearlyMonth
            break
          case 'specific_months':
            if (template.specificMonths) {
              const months = JSON.parse(template.specificMonths)
              shouldApply = months.includes(targetMonth)
            }
            break
        }

        if (!shouldApply) continue

        const alreadyApplied = createdTransactions.some(
          (t) => t.templateId === template.id,
        )
        if (alreadyApplied) continue

        let dayOfMonth = template.dayOfMonth || 15
        if (template.recurrenceType === 'yearly' && template.dayOfMonth) {
          dayOfMonth = template.dayOfMonth % 100
        }

        const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate()
        if (dayOfMonth > lastDayOfMonth) {
          dayOfMonth = lastDayOfMonth
        }

        const dueDate = new Date(targetYear, targetMonth - 1, dayOfMonth)

        const newTransaction = db
          .insert(plannedTransactions)
          .values({
            id: randomUUID(),
            userId: user!.id,
            planId: newPlanId,
            templateId: template.id,
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

        createdTransactions.push(newTransaction)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Finanzplan erfolgreich dupliziert',
        data: {
          plan: newPlan,
          transactionsCreated: createdTransactions.length,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error duplicating fiscal plan:', error)

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
        message: 'Fehler beim Duplizieren des Finanzplans',
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
