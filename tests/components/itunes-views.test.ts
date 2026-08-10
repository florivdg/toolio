import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { resetToasts, toastText } from '../support/toast'

/**
 * Covers what the two grid views do around their cards: which empty state shows,
 * and how add and remove behave. The network is stubbed at `fetch` so the real
 * ofetch client still runs.
 */

const push = mock(() => {})
mock.module('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {} }),
}))

const SearchView = (await import('@/components/itunes/SearchView.vue')).default
const WatchlistView = (await import('@/components/itunes/WatchlistView.vue'))
  .default

/** Requests the stub saw, so tests can assert what was sent. */
let requests: { url: string; method: string; body: any }[] = []
let originalFetch: typeof globalThis.fetch

/** Answers every request from a table keyed by a substring of the path. */
function stubNetwork(routes: Record<string, unknown>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    requests.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })

    const match = Object.keys(routes).find((path) => url.includes(path))

    return Response.json(match ? routes[match] : { success: false })
  }) as typeof fetch
}

/** Lets pending promises settle and the DOM re-render. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  originalFetch = globalThis.fetch
  requests = []
  resetToasts()
  push.mockClear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  document.body.innerHTML = ''
})

function searchResult(overrides: Record<string, unknown> = {}) {
  return {
    wrapperType: 'track',
    kind: 'feature-movie',
    trackId: 1001,
    trackName: 'Interstellar',
    artistName: 'Christopher Nolan',
    currency: 'EUR',
    trackPrice: 9.99,
    ...overrides,
  }
}

function watchlistRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    name: 'Interstellar',
    entityType: 'feature-movie',
    currency: 'EUR',
    additionalData: JSON.stringify({ trackPrice: 9.99 }),
    ...overrides,
  }
}

describe('SearchView', () => {
  test('invites a search before anything has been searched', () => {
    stubNetwork({})
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    expect(w.text()).toContain('Geben Sie einen Suchbegriff ein')
  })

  test('reports an empty result set after searching', async () => {
    stubNetwork({ '/api/itunes/search': { resultCount: 0, results: [] } })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', { term: 'x' })
    await settle()

    expect(w.text()).toContain('Keine Ergebnisse gefunden')
  })

  test('renders a card per result', async () => {
    stubNetwork({
      '/api/itunes/search': { resultCount: 1, results: [searchResult()] },
    })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', { term: 'inter' })
    await settle()

    expect(w.findAllComponents({ name: 'SearchResultCard' })).toHaveLength(1)
    expect(w.text()).toContain('Interstellar')
  })

  test('passes the media filter through to the API', async () => {
    stubNetwork({ '/api/itunes/search': { resultCount: 0, results: [] } })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', {
      term: 'inter',
      media: 'movie',
    })
    await settle()

    expect(requests[0]!.url).toContain('term=inter')
    expect(requests[0]!.url).toContain('media=movie')
  })

  test('clearing returns to the initial prompt', async () => {
    stubNetwork({
      '/api/itunes/search': { resultCount: 1, results: [searchResult()] },
    })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })
    const bar = w.findComponent({ name: 'SearchBar' })

    bar.vm.$emit('search', { term: 'inter' })
    await settle()
    bar.vm.$emit('clear')
    await settle()

    expect(w.text()).toContain('Geben Sie einen Suchbegriff ein')
  })

  test('adds a result to the watchlist and confirms it', async () => {
    stubNetwork({
      '/api/itunes/search': { resultCount: 1, results: [searchResult()] },
      '/api/itunes/add': { success: true },
    })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', { term: 'inter' })
    await settle()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    const add = requests.find((r) => r.url.includes('/add'))!
    expect(add.body).toEqual({ itunesId: 1001, isCollection: false })
    expect(toastText()).toContain('Element hinzugefügt')
  })

  test('marks a collection-only result as a collection', async () => {
    stubNetwork({
      '/api/itunes/search': {
        resultCount: 1,
        results: [
          searchResult({
            trackId: undefined,
            trackName: undefined,
            collectionId: 2002,
            collectionName: 'Interstellar OST',
            collectionPrice: 11.99,
          }),
        ],
      },
      '/api/itunes/add': { success: true },
    })
    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })

    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', { term: 'inter' })
    await settle()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    expect(requests.find((r) => r.url.includes('/add'))!.body).toEqual({
      itunesId: 2002,
      isCollection: true,
    })
  })

  test('reports a failed add rather than staying silent', async () => {
    stubNetwork({
      '/api/itunes/search': { resultCount: 1, results: [searchResult()] },
    })
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes('/add')) return new Response('no', { status: 500 })

      return Response.json({ resultCount: 1, results: [searchResult()] })
    }) as typeof fetch

    const w = mount(SearchView, { global: { stubs: { SearchBar: true } } })
    w.findComponent({ name: 'SearchBar' }).vm.$emit('search', { term: 'inter' })
    await settle()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    expect(toastText()).toContain('Fehler')
  })
})

describe('WatchlistView', () => {
  test('shows the empty state for an empty watchlist', async () => {
    stubNetwork({ '/api/itunes/list': { success: true, data: [] } })
    const w = mount(WatchlistView)
    await settle()

    expect(w.text()).toContain('Ihre Watchlist ist leer')
  })

  test('lists the stored items and counts them', async () => {
    stubNetwork({
      '/api/itunes/list': {
        success: true,
        data: [watchlistRow(), watchlistRow({ id: 'w2', name: 'Dune' })],
      },
    })
    const w = mount(WatchlistView)
    await settle()

    expect(w.findAllComponents({ name: 'WatchlistItemCard' })).toHaveLength(2)
    expect(w.text()).toContain('2 Elemente')
  })

  test('uses the singular for a single item', async () => {
    stubNetwork({
      '/api/itunes/list': { success: true, data: [watchlistRow()] },
    })
    const w = mount(WatchlistView)
    await settle()

    expect(w.text()).toContain('1 Element')
    expect(w.text()).not.toContain('1 Elemente')
  })

  test('removes an item and drops it from the grid', async () => {
    stubNetwork({
      '/api/itunes/list': { success: true, data: [watchlistRow()] },
      '/api/itunes/remove': { success: true },
    })
    const w = mount(WatchlistView)
    await settle()

    w.findComponent({ name: 'WatchlistItemCard' }).vm.$emit(
      'remove',
      w.findComponent({ name: 'WatchlistItemCard' }).props('item'),
    )
    await settle()

    const remove = requests.find((r) => r.url.includes('/remove'))!
    expect(remove.method).toBe('DELETE')
    expect(remove.body).toEqual({ id: 'w1' })
    expect(w.text()).toContain('Ihre Watchlist ist leer')
    expect(toastText()).toContain('Element entfernt')
  })

  test('keeps the item when the server refuses to remove it', async () => {
    stubNetwork({
      '/api/itunes/list': { success: true, data: [watchlistRow()] },
      '/api/itunes/remove': { success: false, message: 'nope' },
    })
    const w = mount(WatchlistView)
    await settle()

    const card = w.findComponent({ name: 'WatchlistItemCard' })
    card.vm.$emit('remove', card.props('item'))
    await settle()

    expect(w.findAllComponents({ name: 'WatchlistItemCard' })).toHaveLength(1)
    expect(toastText()).toContain('Fehler')
  })

  test('survives a failed fetch without breaking the page', async () => {
    globalThis.fetch = (async () =>
      new Response('no', { status: 500 })) as unknown as typeof fetch
    const w = mount(WatchlistView)
    await settle()

    expect(w.text()).toContain('Ihre Watchlist ist leer')
  })
})
