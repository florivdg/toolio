import type { APIRoute } from 'astro'
import { updateAllMediaItemPrices } from '@/lib/itunes/storage'

export const GET: APIRoute = async () => {
  try {
    // Update prices for all stored media items
    const result = await updateAllMediaItemPrices()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Preise erfolgreich aktualisiert',
        data: {
          total: result.total,
          updated: result.updated,
          errors: result.errors,
          errorDetails: result.errorDetails,
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
    console.error('Error updating iTunes media item prices:', error)

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler beim Aktualisieren der Preise',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
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
