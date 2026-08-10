import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'

/** Remove all iTunes data so each test starts from a known state. */
export function resetItunes(): void {
  db.delete(itunesPriceHistory).run()
  db.delete(itunesMediaItem).run()
}

/** A movie result shaped like the real iTunes lookup payload. */
export function itunesMovie(overrides: Record<string, any> = {}) {
  return {
    wrapperType: 'track',
    kind: 'feature-movie',
    trackId: 1001,
    artistName: 'Christopher Nolan',
    trackName: 'Interstellar',
    trackCensoredName: 'Interstellar',
    trackViewUrl: 'https://itunes.example/movie/1001',
    artworkUrl100: 'https://itunes.example/art/100x100bb.jpg',
    trackPrice: 9.99,
    trackHdPrice: 12.99,
    releaseDate: '2014-11-05T08:00:00Z',
    country: 'DEU',
    currency: 'EUR',
    primaryGenreName: 'Sci-Fi',
    ...overrides,
  }
}

/** An album result, which the mapper classifies as a collection. */
export function itunesAlbum(overrides: Record<string, any> = {}) {
  return {
    wrapperType: 'collection',
    collectionType: 'Album',
    collectionId: 2002,
    artistName: 'Hans Zimmer',
    collectionName: 'Interstellar OST',
    collectionCensoredName: 'Interstellar OST',
    collectionViewUrl: 'https://itunes.example/album/2002',
    collectionPrice: 11.99,
    releaseDate: '2014-11-18T08:00:00Z',
    country: 'DEU',
    currency: 'EUR',
    primaryGenreName: 'Soundtrack',
    ...overrides,
  }
}

/** A stubbed network: canned lookups plus whatever notifications were sent. */
export interface ItunesNetworkStub {
  /** Messages the code under test broadcast, in order. */
  notifications: string[]
  /** Restores the real fetch. Never skip this — the stub is process-global. */
  restore: () => void
}

/**
 * Replace global fetch with a table of canned iTunes responses keyed by the
 * `id` query parameter, so the lookup client is exercised for real while the
 * network is not.
 *
 * The notification endpoint is stubbed too. Leaving it to the real fetch would
 * make a price-drop test post to the live broadcast API.
 */
export function stubItunesNetwork(
  responsesById: Record<number, Record<string, any>[]>,
): ItunesNetworkStub {
  const original = globalThis.fetch
  const notifications: string[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString())

    if (url.pathname.endsWith('/noti/broadcast')) {
      const body = JSON.parse(String(init?.body ?? '{}'))
      notifications.push(body.message)

      return Response.json({ sent: true })
    }

    const results = responsesById[Number(url.searchParams.get('id'))] ?? []

    return Response.json({ resultCount: results.length, results })
  }) as typeof fetch

  return {
    notifications,
    restore: () => {
      globalThis.fetch = original
    },
  }
}
