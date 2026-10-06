import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from 'bun:test'
import { db } from '@/db/database'
import { itunesMediaItem } from '@/db/schema/itunes'
import { GET as listItems } from '@/pages/api/itunes/list'
import { GET as searchItunes } from '@/pages/api/itunes/search'
import { POST as addItem } from '@/pages/api/itunes/add'
import { DELETE as removeItem } from '@/pages/api/itunes/remove'
import {
  ALL as updateAnyOtherMethod,
  POST as updatePrices,
} from '@/pages/api/itunes/update-prices'
import { lookupAndStoreItem } from '@/lib/itunes/storage'
import { PRICE_UPDATE_COOLDOWN_MS } from '@/lib/itunes/price-update-guard'
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

describe('POST /api/itunes/update-prices', () => {
  const SECRET = 'cron-secret-for-tests'
  const PRICE_UPDATES_URL = 'http://localhost/api/itunes/update-prices'
  const originalSecret = process.env.PRICE_UPDATE_CRON_SECRET

  /**
   * The route keeps its cooldown in module state for the life of the process,
   * so each test starts well past the previous one's run on a fake clock.
   */
  let clock = Date.parse('2026-01-01T00:00:00Z')

  /** iTunes lookups since setup, the work a rejected call must not do. */
  const lookups = () => net!.lookups.length

  beforeEach(async () => {
    process.env.PRICE_UPDATE_CRON_SECRET = SECRET
    clock += 10 * PRICE_UPDATE_COOLDOWN_MS
    setSystemTime(new Date(clock))

    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)
    network({ 1001: [itunesMovie({ trackPrice: 4.99 })] })
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.PRICE_UPDATE_CRON_SECRET
    } else {
      process.env.PRICE_UPDATE_CRON_SECRET = originalSecret
    }
  })

  afterAll(() => {
    setSystemTime()
  })

  function update(authorization?: string) {
    return callRoute(updatePrices, {
      url: PRICE_UPDATES_URL,
      headers: authorization ? { Authorization: authorization } : {},
    })
  }

  test('runs the update for the scheduler secret and reports the summary', async () => {
    const { status, body } = await readJson(await update(`Bearer ${SECRET}`))

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({ total: 1, updated: 1, errors: 0 })
    expect(lookups()).toBe(1)
  })

  test('rejects a request without credentials before doing any work', async () => {
    const { status, body } = await readJson(await update())

    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(lookups()).toBe(0)
  })

  test('rejects a wrong secret', async () => {
    const { status } = await readJson(await update('Bearer falsch'))

    expect(status).toBe(401)
    expect(lookups()).toBe(0)
  })

  /** A signed-in user is not the scheduler; the session does not count. */
  test('rejects a signed-in user without the secret', async () => {
    const response = await callRoute(updatePrices, {
      url: PRICE_UPDATES_URL,
      locals: { user: { id: 'user-1' }, session: { userId: 'user-1' } },
    })

    expect(response.status).toBe(401)
    expect(lookups()).toBe(0)
  })

  test('rejects everything when the secret is not configured', async () => {
    delete process.env.PRICE_UPDATE_CRON_SECRET
    expect((await update('Bearer ')).status).toBe(401)
    expect((await update('Bearer undefined')).status).toBe(401)

    process.env.PRICE_UPDATE_CRON_SECRET = ''
    expect((await update('Bearer ')).status).toBe(401)

    expect(lookups()).toBe(0)
  })

  /** The old cron used GET; it must no longer trigger anything. */
  test('does nothing for a GET', async () => {
    const response = await callRoute(updateAnyOtherMethod, {
      url: PRICE_UPDATES_URL,
      method: 'GET',
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(lookups()).toBe(0)
  })

  test('refuses an overlapping run without starting it', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    const stubbed = globalThis.fetch
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      await held
      return stubbed(...args)
    }) as typeof fetch

    const first = update(`Bearer ${SECRET}`)
    const overlapping = await readJson(await update(`Bearer ${SECRET}`))

    expect(overlapping.status).toBe(429)
    expect(overlapping.body.message).toBe('Preisaktualisierung läuft bereits')

    release()
    expect((await first).status).toBe(200)
    expect(lookups()).toBe(1)
  })

  test('refuses a second run within the cooldown, then allows it', async () => {
    expect((await update(`Bearer ${SECRET}`)).status).toBe(200)

    const tooSoon = await update(`Bearer ${SECRET}`)
    expect(tooSoon.status).toBe(429)
    expect(tooSoon.headers.get('Retry-After')).toBe('60')
    expect(lookups()).toBe(1)

    setSystemTime(new Date(clock + PRICE_UPDATE_COOLDOWN_MS))
    expect((await update(`Bearer ${SECRET}`)).status).toBe(200)
    expect(lookups()).toBe(2)
  })
})
