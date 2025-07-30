import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '@/db/database'
import {
  transactionTemplates,
  transactionTemplateSchema,
  type TransactionTemplateWithMonths,
} from '@/db/schema/fiscal-planner'
import { eq, and } from 'drizzle-orm'

const pathParamsSchema = z.object({
  id: z.string().uuid(),
})

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user

    const { id } = pathParamsSchema.parse(params)

    const template = db
      .select()
      .from(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, user!.id),
        ),
      )
      .get()

    if (!template) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vorlage nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const templateWithParsedMonths: TransactionTemplateWithMonths = {
      ...template,
      specificMonths: template.specificMonths
        ? JSON.parse(template.specificMonths)
        : null,
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: templateWithParsedMonths,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching template:', error)

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
        message: 'Fehler beim Laden der Vorlage',
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

    if (body.specificMonths && Array.isArray(body.specificMonths)) {
      body.specificMonths = JSON.stringify(body.specificMonths)
    }

    const validated = transactionTemplateSchema.parse(body)

    const existingTemplate = db
      .select()
      .from(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, user!.id),
        ),
      )
      .get()

    if (!existingTemplate) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vorlage nicht gefunden',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const updatedTemplate = db
      .update(transactionTemplates)
      .set({
        ...validated,
        userId: user!.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, user!.id),
        ),
      )
      .returning()
      .get()

    const templateWithParsedMonths: TransactionTemplateWithMonths = {
      ...updatedTemplate,
      specificMonths: updatedTemplate.specificMonths
        ? JSON.parse(updatedTemplate.specificMonths)
        : null,
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vorlage erfolgreich aktualisiert',
        data: templateWithParsedMonths,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error updating template:', error)

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
        message: 'Fehler beim Aktualisieren der Vorlage',
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

    const deletedTemplate = db
      .delete(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, user!.id),
        ),
      )
      .returning()
      .get()

    if (!deletedTemplate) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vorlage nicht gefunden',
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
        message: 'Vorlage erfolgreich gelöscht',
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
    console.error('Error deleting template:', error)

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
        message: 'Fehler beim Löschen der Vorlage',
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
