import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  transactionTemplates,
  transactionTemplateSchema,
  type TransactionTemplateWithMonths,
} from '@/db/schema/fiscal-planner'
import { desc, eq, and, count } from 'drizzle-orm'

const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['income', 'expense']).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
})

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user

    const params = Object.fromEntries(url.searchParams.entries())
    const { limit, offset, type, isActive } = queryParamsSchema.parse(params)

    const whereConditions = [eq(transactionTemplates.userId, user!.id)]

    if (type) {
      whereConditions.push(eq(transactionTemplates.type, type))
    }
    if (isActive !== undefined) {
      whereConditions.push(eq(transactionTemplates.isActive, isActive))
    }

    const whereClause = and(...whereConditions)

    const templates = db
      .select()
      .from(transactionTemplates)
      .where(whereClause)
      .orderBy(desc(transactionTemplates.createdAt))
      .limit(limit)
      .offset(offset)
      .all()

    const templatesWithParsedMonths: TransactionTemplateWithMonths[] =
      templates.map((template) => ({
        ...template,
        specificMonths: template.specificMonths
          ? JSON.parse(template.specificMonths)
          : null,
      }))

    const countResult = db
      .select({ count: count() })
      .from(transactionTemplates)
      .where(whereClause)
      .get()
    const totalCount = countResult?.count ?? 0

    return new Response(
      JSON.stringify({
        success: true,
        data: templatesWithParsedMonths,
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
    console.error('Error fetching templates:', error)

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
        message: 'Fehler beim Laden der Vorlagen',
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

    if (body.specificMonths && Array.isArray(body.specificMonths)) {
      body.specificMonths = JSON.stringify(body.specificMonths)
    }

    const validated = transactionTemplateSchema.parse(body)

    const newTemplate = db
      .insert(transactionTemplates)
      .values({
        ...validated,
        userId: user!.id,
        updatedAt: new Date(),
      })
      .returning()
      .get()

    const templateWithParsedMonths: TransactionTemplateWithMonths = {
      ...newTemplate,
      specificMonths: newTemplate.specificMonths
        ? JSON.parse(newTemplate.specificMonths)
        : null,
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vorlage erfolgreich erstellt',
        data: templateWithParsedMonths,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error creating template:', error)

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
        message: 'Fehler beim Erstellen der Vorlage',
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
