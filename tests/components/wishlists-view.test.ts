import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetToasts, toastText } from '../support/toast'

/**
 * Covers the overview's async states and its load-more paging. The query is
 * replaced so the component mounts without a server or a Pinia store; the
 * load-more path goes through the real `fetch`, which is stubbed.
 */

const push = mock(() => {})
mock.module('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {} }),
}))

import { resetQueries, wishlistsQuery as listQuery } from '../support/queries'

const WishlistsView = (await import('@/components/wishlists/WishlistsView.vue'))
  .default
const WishlistCard = (await import('@/components/wishlists/WishlistCard.vue'))
  .default

let originalFetch: typeof globalThis.fetch
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function page(count: number, total = count, startAt = 0) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `w${startAt + i}`,
      name: `Liste ${startAt + i}`,
    })),
    pagination: { limit: 12, offset: 0, total, hasMore: total > count },
  }
}

/**
 * The view fills its list in `onMounted`, so the DOM only reflects the data
 * after a tick. Every mount here awaits that.
 */
async function mountView() {
  const wrapper = mount(WishlistsView, {
    global: { stubs: { CreateWishlistModal: true } },
  })
  await nextTick()

  return wrapper
}

beforeEach(() => {
  resetQueries()
  originalFetch = globalThis.fetch
  listQuery.data.value = page(0, 0)
  listQuery.isLoading.value = false
  listQuery.error.value = null
  resetToasts()
  push.mockClear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  document.body.innerHTML = ''
})

describe('WishlistsView state machine', () => {
  test('shows skeletons while loading', async () => {
    listQuery.isLoading.value = true
    const w = await mountView()

    expect(w.findAll('.animate-pulse')).toHaveLength(6)
    expect(w.findAllComponents({ name: 'WishlistCard' })).toHaveLength(0)
  })

  test('shows the error branch with its message and a retry', async () => {
    listQuery.error.value = new Error('Netzwerk kaputt')
    const w = await mountView()

    expect(w.text()).toContain('Fehler beim Laden der Wishlists')
    expect(w.text()).toContain('Netzwerk kaputt')

    await w.find('button').trigger('click')
    expect(listQuery.refetch).toHaveBeenCalled()
  })

  test('loading wins over an error', async () => {
    listQuery.isLoading.value = true
    listQuery.error.value = new Error('egal')
    const w = await mountView()

    expect(w.findAll('.animate-pulse')).toHaveLength(6)
    expect(w.text()).not.toContain('Fehler beim Laden')
  })

  test('invites a first wishlist when there are none', async () => {
    const w = await mountView()

    expect(w.text()).toContain('Noch keine Wishlists')
  })

  test('renders a card per wishlist', async () => {
    listQuery.data.value = page(3)
    const w = await mountView()

    expect(w.findAllComponents({ name: 'WishlistCard' })).toHaveLength(3)
    expect(w.text()).not.toContain('Noch keine Wishlists')
  })

  test('navigates on open', async () => {
    listQuery.data.value = page(1)
    const w = await mountView()

    w.findComponent({ name: 'WishlistCard' }).vm.$emit('open', 'w0')
    await settle()

    expect(push).toHaveBeenCalledWith('/tools/wishlists/w0')
  })
})

describe('WishlistsView paging', () => {
  test('offers load more only while pages remain', async () => {
    listQuery.data.value = page(12, 30)
    expect((await mountView()).text()).toContain('Mehr laden')

    listQuery.data.value = page(3, 3)
    expect((await mountView()).text()).not.toContain('Mehr laden')
  })

  test('appends the next page', async () => {
    listQuery.data.value = page(12, 20)
    let requestedUrl = ''
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = input.toString()

      return Response.json({ success: true, data: page(8, 20, 12).data })
    }) as unknown as typeof fetch

    const w = await mountView()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    expect(requestedUrl).toContain('offset=12')
    expect(w.findAllComponents({ name: 'WishlistCard' })).toHaveLength(20)
    // Every page is full now, so the button goes away.
    expect(w.text()).not.toContain('Mehr laden')
  })

  test('normalises later pages like the first', async () => {
    listQuery.data.value = page(12, 13)
    globalThis.fetch = (async () =>
      Response.json({
        success: true,
        data: [{ id: 'w99', name: 'Ohne Zusammenfassung' }],
      })) as unknown as typeof fetch

    const w = await mountView()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    // Read the fields individually: the prop is a reactive proxy, which
    // toMatchObject does not see through.
    const added = w.findAllComponents({ name: 'WishlistCard' }).at(-1)!
    const props = added.props('wishlist') as Record<string, unknown>

    expect(props.id).toBe('w99')
    expect(props.itemCount).toBe(0)
    expect(props.latestItems).toEqual([])
  })

  test('reports a failed page load and keeps what it has', async () => {
    listQuery.data.value = page(12, 20)
    globalThis.fetch = (async () =>
      new Response('no', { status: 500 })) as unknown as typeof fetch

    const w = await mountView()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    expect(toastText()).toContain('Fehler beim Laden weiterer Wishlists')
    expect(w.findAllComponents({ name: 'WishlistCard' })).toHaveLength(12)
  })

  test('reports an unsuccessful envelope as a failure', async () => {
    listQuery.data.value = page(12, 20)
    globalThis.fetch = (async () =>
      Response.json({ success: false })) as unknown as typeof fetch

    const w = await mountView()
    await w.findAll('button').at(-1)!.trigger('click')
    await settle()

    expect(toastText()).toContain('Fehler beim Laden weiterer Wishlists')
  })
})

describe('WishlistCard', () => {
  const wishlist = {
    id: 'w1',
    name: 'Umzug',
    description: 'Ideen',
    itemCount: 2,
    latestItems: [
      { id: 'i1', name: 'Kaffeemühle', price: 89.9 },
      { id: 'i2', name: 'Stuhl', imageUrl: 'https://example.com/a.jpg' },
    ],
  }

  test('shows the name, description and item count', async () => {
    const w = mount(WishlistCard, { props: { wishlist } as never })

    expect(w.text()).toContain('Umzug')
    expect(w.text()).toContain('Ideen')
    expect(w.text()).toContain('2')
  })

  test('previews the latest items with prices and images', async () => {
    const w = mount(WishlistCard, { props: { wishlist } as never })

    expect(w.text()).toContain('Kaffeemühle')
    expect(w.text()).toContain('89.90€')
    expect(w.find('img').attributes('src')).toBe('https://example.com/a.jpg')
  })

  test('says so when a wishlist has no items yet', async () => {
    const w = mount(WishlistCard, {
      props: { wishlist: { ...wishlist, latestItems: [] } } as never,
    })

    expect(w.text()).toContain('Noch keine Artikel hinzugefügt')
  })

  test('survives a response that omits latestItems entirely', async () => {
    const w = mount(WishlistCard, {
      props: { wishlist: { id: 'w1', name: 'Umzug' } } as never,
    })

    expect(w.text()).toContain('Noch keine Artikel hinzugefügt')
    expect(w.text()).toContain('0')
  })

  test('emits open from the card and from its button', async () => {
    const w = mount(WishlistCard, { props: { wishlist } as never })

    await w.findAll('button').at(-1)!.trigger('click')
    await w.trigger('click')

    expect(w.emitted('open')).toHaveLength(2)
    expect(w.emitted('open')![0]).toEqual(['w1'])
  })
})
