import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetQueries, wishlistsQuery } from '../support/queries'

/**
 * The wishlists shell renders the sidebar. It is a plain router layout, so the
 * only behaviour worth pinning is which sidebar branch shows and what each
 * wishlist link points at.
 */

const WishlistsApp = (await import('@/pages/tools/wishlists/_app.vue')).default

/** Renders the link body so hrefs and labels are assertable. */
const RouterLinkStub = {
  props: ['to'],
  render(this: any) {
    return this.$slots.default?.({
      isActive: false,
      isExactActive: false,
      href: this.to,
      navigate: () => {},
    })
  },
}

async function mountApp() {
  const wrapper = mount(WishlistsApp, {
    global: {
      stubs: {
        Toaster: true,
        'router-view': true,
        'router-link': RouterLinkStub,
      },
    },
  })
  await nextTick()

  return wrapper
}

function page(wishlists: Record<string, unknown>[]) {
  return {
    data: wishlists,
    pagination: { limit: 50, offset: 0, total: wishlists.length },
  }
}

beforeEach(() => {
  resetQueries()
  wishlistsQuery.data.value = page([])
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('wishlists app shell', () => {
  test('always offers the all-wishlists link', async () => {
    const w = await mountApp()

    expect(w.text()).toContain('Alle Wishlists')
  })

  test('shows skeletons while the sidebar loads', async () => {
    wishlistsQuery.isLoading.value = true
    const w = await mountApp()

    expect(w.findAll('.animate-pulse')).toHaveLength(3)
  })

  test('says so when there are no wishlists', async () => {
    const w = await mountApp()

    expect(w.text()).toContain('Keine Wishlists vorhanden')
  })

  test('links each wishlist by id', async () => {
    wishlistsQuery.data.value = page([
      { id: 'w1', name: 'Umzug', itemCount: 3 },
      { id: 'w2', name: 'Geburtstag', itemCount: 0 },
    ])
    const w = await mountApp()

    const links = w.findAll('a').map((a) => a.attributes('href'))
    expect(links).toContain('/tools/wishlists/w1')
    expect(links).toContain('/tools/wishlists/w2')
    expect(w.text()).toContain('Umzug')
    expect(w.text()).toContain('Meine Listen')
  })

  test('shows the item count, including zero', async () => {
    wishlistsQuery.data.value = page([{ id: 'w2', name: 'Leer', itemCount: 0 }])
    const w = await mountApp()

    expect(w.text()).toContain('0')
  })

  test('omits the count when the response carries none', async () => {
    wishlistsQuery.data.value = page([{ id: 'w3', name: 'Ohne Zähler' }])
    const w = await mountApp()

    // The name is still there; only the trailing count badge is absent.
    expect(w.text()).toContain('Ohne Zähler')
    expect(w.text()).not.toContain('undefined')
  })

  test('survives a sidebar query that returned nothing', async () => {
    wishlistsQuery.data.value = null
    const w = await mountApp()

    expect(w.text()).toContain('Keine Wishlists vorhanden')
  })
})
