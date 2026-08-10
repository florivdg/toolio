import type { APIRoute } from 'astro'
import { updateAllMediaItemPrices } from '@/lib/itunes/storage'
import { ok, serverError } from '@/lib/api/responses'

export const GET: APIRoute = async () => {
  try {
    // Update prices for all stored media items
    const result = await updateAllMediaItemPrices()

    return ok(result, 'Preise erfolgreich aktualisiert')
  } catch (error) {
    console.error('Error updating iTunes media item prices:', error)

    return serverError(
      'Fehler beim Aktualisieren der Preise',
      error instanceof Error ? error : 'Unbekannter Fehler',
    )
  }
}
