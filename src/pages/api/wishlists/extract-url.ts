import type { APIRoute } from 'astro'
import { z } from 'zod'
import { extractProductDetailsFromUrl } from '@/lib/wishlists/url-extractor'

const ExtractUrlSchema = z.object({
  url: z.string().url('URL muss gültig sein'),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { url } = ExtractUrlSchema.parse(body)

    const productDetails = await extractProductDetailsFromUrl(url)

    return new Response(
      JSON.stringify({
        success: true,
        data: productDetails,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error extracting URL details:', error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Ungültige Eingabedaten',
          details: error.errors,
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
        error: 'Fehler beim Extrahieren der URL-Details',
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
