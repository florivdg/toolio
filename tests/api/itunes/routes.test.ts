import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { itunesMediaItem } from '@/db/schema/itunes'
import { GET as listItems } from '@/pages/api/itunes/list'
import { GET as searchItunes } from '@/pages/api/itunes/search'
import { POST as addItem } from '@/pages/api/itunes/add'
import { DELETE as removeItem } from '@/pages/api/itunes/remove'
import { GET as updatePrices } from '@/pages/api/itunes/update-prices'
import { lookupAndStoreItem } from '@/lib/itunes/storage'
import {
  itunesAlbum,
  itunesMovie,
  resetItunes,
  stubItunesNetwork,
} from '../../support/itunes'
import type { ItunesNetworkStub } from '../../support/itunes'
import { callRoute, readJson } from '../../support/route'

let net: ItunesNetworkStub | null = null

function network(responsesById: Record<number, Record<string, any>[]> = {}) {
  net?.restore()
  net = stubItunesNetwork(responsesById)

  return net
}

/** Calls the list route with the given query string. */
async function list(query = '') {
  return readJson(
    await callRoute(listItems, {
      url: `http://localhost/api/itunes/list${query}`,
    }),
  )
}

beforeEach(() => {
  resetItunes()
})

afterEach(() => {
  net?.restore()
  net = null
})

describe('GET /api/itunes/list', () => {
  beforeEach(async () => {
    network({ 1001: [itunesMovie()], 2002: [itunesAlbum()] })
    await lookupAndStoreItem(1001)
    await lookupAndStoreItem(2002, true)
  })

  test('returns every stored item with paging info', async () => {
    const { status, body } = await list()

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body).toMatchObject({ count: 2, offset: 0, limit: 20 })
  })

  test('decodes additionalData instead of returning the raw JSON string', async () => {
    const { body } = await list()

    expect(typeof body.data[0].additionalData).toBe('object')
  })

  test('filters by name case-insensitively as a substring', async () => {
    const { body } = await list('?name=INTERSTELLAR')

    expect(body.data).toHaveLength(2)

    const ost = await list('?name=OST')
    expect(ost.body.data).toHaveLength(1)
    expect(ost.body.data[0].name).toBe('Interstellar OST')
  })

  test('filters by artist, genre, media type and entity type', async () => {
    expect((await list('?artistName=zimmer')).body.data).toHaveLength(1)
    expect((await list('?genreName=sci')).body.data).toHaveLength(1)
    expect((await list('?mediaType=music')).body.data).toHaveLength(1)
    expect((await list('?entityType=feature-movie')).body.data).toHaveLength(1)
  })

  test('combines filters conjunctively', async () => {
    const { body } = await list('?name=Interstellar&artistName=zimmer')

    expect(body.data).toHaveLength(1)
  })

  test('honours limit and offset', async () => {
    const first = await list('?limit=1')
    const second = await list('?limit=1&offset=1')

    expect(first.body.data).toHaveLength(1)
    expect(second.body.data).toHaveLength(1)
    expect(second.body.data[0].id).not.toBe(first.body.data[0].id)
  })

  test('omits prices unless asked', async () => {
    const { body } = await list()

    expect(body.data[0]).not.toHaveProperty('prices')
  })

  test('includes price history when withPrices=true', async () => {
    const { body } = await list('?withPrices=true')

    expect(body.data[0].prices).toHaveLength(1)
    expect(body.data[0].prices[0]).toHaveProperty('standardPrice')
  })

  /**
   * `z.coerce.boolean()` is `Boolean(value)`, so the literal string 'false' used
   * to coerce to true and this returned the price-joined payload.
   */
  test('treats withPrices=false as false', async () => {
    const { body } = await list('?withPrices=false')

    expect(body.data[0]).not.toHaveProperty('prices')
  })

  test('returns an empty list rather than failing when nothing matches', async () => {
    const { status, body } = await list('?name=nichts&withPrices=true')

    expect(status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.count).toBe(0)
  })

  test('rejects an out-of-range limit', async () => {
    const { status, body } = await list('?limit=500')

    expect(status).toBe(400)
    expect(body.message).toBe('Invalid query parameters')
    expect(body.errors).toBeDefined()
  })

  test('rejects a non-numeric offset', async () => {
    expect((await list('?offset=abc')).status).toBe(400)
  })
})

describe('GET /api/itunes/search', () => {
  test('passes the term through and returns the results', async () => {
    network()
    const { status, body } = await readJson(
      await callRoute(searchItunes, {
        url: 'http://localhost/api/itunes/search?term=interstellar',
      }),
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body).toHaveProperty('resultCount')
  })

  test('requires a search term', async () => {
    network()
    const { status, body } = await readJson(
      await callRoute(searchItunes, {
        url: 'http://localhost/api/itunes/search',
      }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Invalid query parameters')
  })

  test('reports an upstream failure as a 500', async () => {
    net?.restore()
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response('boom', {
        status: 503,
        statusText: 'Service Unavailable',
      })) as unknown as typeof fetch

    const { status, body } = await readJson(
      await callRoute(searchItunes, {
        url: 'http://localhost/api/itunes/search?term=x',
      }),
    )
    globalThis.fetch = original

    expect(status).toBe(500)
    expect(body.message).toBe('Failed to search iTunes')
  })
})

describe('POST /api/itunes/add', () => {
  test('stores a track and reports its id', async () => {
    network({ 1001: [itunesMovie()] })

    const { status, body } = await readJson(
      await callRoute(addItem, { body: { itunesId: 1001 } }),
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.mediaItemId).toBeString()
    expect(db.select().from(itunesMediaItem).all()).toHaveLength(1)
  })

  test('stores a collection when told to', async () => {
    network({ 2002: [itunesAlbum()] })

    const { status } = await readJson(
      await callRoute(addItem, {
        body: { itunesId: 2002, isCollection: true },
      }),
    )

    expect(status).toBe(200)
    expect(db.select().from(itunesMediaItem).all()[0]!.itunesIdType).toBe(
      'collection',
    )
  })

  test('answers 404 for an id the store does not know', async () => {
    network({})

    const { status, body } = await readJson(
      await callRoute(addItem, { body: { itunesId: 9999 } }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Item not found in iTunes store')
  })

  test('rejects a body without a numeric id', async () => {
    network()

    const { status, body } = await readJson(
      await callRoute(addItem, { body: { itunesId: 'abc' } }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Validation error')
  })
})

describe('DELETE /api/itunes/remove', () => {
  test('removes a stored item', async () => {
    network({ 1001: [itunesMovie()] })
    const { mediaItemId } = await lookupAndStoreItem(1001)

    const { status, body } = await readJson(
      await callRoute(removeItem, { body: { id: mediaItemId } }),
    )

    expect(status).toBe(200)
    expect(body.removedItemId).toBe(mediaItemId)
    expect(db.select().from(itunesMediaItem).all()).toHaveLength(0)
  })

  test('answers 404 for an id that is not stored', async () => {
    const { status, body } = await readJson(
      await callRoute(removeItem, {
        body: { id: '00000000-0000-4000-8000-000000000000' },
      }),
    )

    expect(status).toBe(404)
    expect(body.message).toBe('Medienelement nicht gefunden')
  })

  test('rejects an id that is not a uuid', async () => {
    const { status, body } = await readJson(
      await callRoute(removeItem, { body: { id: 'nope' } }),
    )

    expect(status).toBe(400)
    expect(body.message).toBe('Ungültige Anfrageparameter')
  })
})

describe('GET /api/itunes/update-prices', () => {
  test('reports the run summary', async () => {
    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)

    network({ 1001: [itunesMovie({ trackPrice: 4.99 })] })
    const { status, body } = await readJson(await callRoute(updatePrices))

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({ total: 1, updated: 1, errors: 0 })
  })
})
