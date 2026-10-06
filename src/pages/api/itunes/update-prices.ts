import type { APIRoute } from 'astro'
import { updateAllMediaItemPrices } from '@/lib/itunes/storage'
import {
  PRICE_UPDATE_COOLDOWN_MS,
  createExclusiveRunner,
  isSchedulerAuthorized,
} from '@/lib/itunes/price-update-guard'
import { json, ok, serverError } from '@/lib/api/responses'

/** Module-level, so it spans requests for the life of the server process. */
const priceUpdates = createExclusiveRunner(PRICE_UPDATE_COOLDOWN_MS)

const REFUSAL_MESSAGES = {
  running: 'Preisaktualisierung läuft bereits',
  'cooling-down': 'Preise wurden gerade erst aktualisiert',
} as const

/**
 * Called by the cron with `Authorization: Bearer $PRICE_UPDATE_CRON_SECRET`.
 * The middleware lets it through without a session, so this check is the only
 * thing between the internet and a full run against the iTunes API.
 */
export const POST: APIRoute = async ({ request }) => {
  if (
    !isSchedulerAuthorized(
      request.headers.get('Authorization'),
      process.env.PRICE_UPDATE_CRON_SECRET,
    )
  ) {
    return json({ success: false, message: 'Nicht autorisiert' }, 401)
  }

  try {
    const outcome = await priceUpdates.run(updateAllMediaItemPrices)

    if ('refused' in outcome) {
      const response = json(
        { success: false, message: REFUSAL_MESSAGES[outcome.refused] },
        429,
      )
      response.headers.set(
        'Retry-After',
        String(PRICE_UPDATE_COOLDOWN_MS / 1000),
      )

      return response
    }

    return ok(outcome.value, 'Preise erfolgreich aktualisiert')
  } catch (error) {
    console.error('Error updating iTunes media item prices:', error)

    return serverError(
      'Fehler beim Aktualisieren der Preise',
      error instanceof Error ? error : 'Unbekannter Fehler',
    )
  }
}

/** Anything but POST, including the GET the old cron sent, does nothing. */
export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })
