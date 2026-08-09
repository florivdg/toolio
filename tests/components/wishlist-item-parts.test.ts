import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { WishlistItem } from '@/db/schema/wishlists'
import WishlistItemPrice from '@/components/wishlists/item/WishlistItemPrice.vue'
import WishlistItemPriority from '@/components/wishlists/item/WishlistItemPriority.vue'
import WishlistItemStatusBadge from '@/components/wishlists/item/WishlistItemStatusBadge.vue'
import WishlistItemThumbnail from '@/components/wishlists/item/WishlistItemThumbnail.vue'
import WishlistItemActions from '@/components/wishlists/item/WishlistItemActions.vue'
import WishlistItemsPagination from '@/components/wishlists/item/WishlistItemsPagination.vue'
import { normalizeSpaces } from '../support/intl'

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'item-1',
    wishlistId: 'list-1',
    name: 'Kaffeemühle',
    url: 'https://example.com/p/1',
    isActive: true,
    isPurchased: false,
    ...overrides,
  } as WishlistItem
}

describe('WishlistItemPrice', () => {
  test('formats a price', () => {
    const w = mount(WishlistItemPrice, { props: { price: 89.9 } })
    expect(normalizeSpaces(w.text())).toBe('89,90 €')
  })

  test('shows a placeholder when there is no price', () => {
    expect(mount(WishlistItemPrice, { props: { price: null } }).text()).toBe(
      'Kein Preis',
    )
  })

  test('treats zero as no price, matching the original markup', () => {
    expect(mount(WishlistItemPrice, { props: { price: 0 } }).text()).toBe(
      'Kein Preis',
    )
  })
})

describe('WishlistItemPriority', () => {
  test('fills one star per priority point', () => {
    const w = mount(WishlistItemPriority, { props: { priority: 3 } })
    expect(w.findAll('.fill-yellow-500')).toHaveLength(3)
    expect(w.text()).toContain('(3)')
  })

  test('renders five stars regardless of priority', () => {
    const w = mount(WishlistItemPriority, { props: { priority: 2 } })
    expect(w.findAll('svg')).toHaveLength(5)
  })

  test('treats a missing priority as zero', () => {
    const w = mount(WishlistItemPriority, { props: { priority: null } })
    expect(w.findAll('.fill-yellow-500')).toHaveLength(0)
    expect(w.text()).toContain('(0)')
  })
})

describe('WishlistItemStatusBadge', () => {
  test('purchased wins over inactive', () => {
    const w = mount(WishlistItemStatusBadge, {
      props: { isPurchased: true, isActive: false },
    })
    expect(w.text()).toBe('Gekauft')
  })

  test('reports inactive when not purchased', () => {
    const w = mount(WishlistItemStatusBadge, {
      props: { isPurchased: false, isActive: false },
    })
    expect(w.text()).toBe('Inaktiv')
  })

  test('reports active otherwise', () => {
    const w = mount(WishlistItemStatusBadge, {
      props: { isPurchased: false, isActive: true },
    })
    expect(w.text()).toBe('Aktiv')
  })
})

describe('WishlistItemThumbnail', () => {
  test('renders the image when a src is given', () => {
    const w = mount(WishlistItemThumbnail, {
      props: { src: 'https://example.com/a.jpg', alt: 'Kaffeemühle' },
    })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('Kaffeemühle')
  })

  test('falls back to an icon without a src', () => {
    const w = mount(WishlistItemThumbnail, { props: { alt: 'x' } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('svg').exists()).toBe(true)
  })

  test('uses the larger box for the card variant', () => {
    const sm = mount(WishlistItemThumbnail, { props: { alt: 'x' } })
    const lg = mount(WishlistItemThumbnail, { props: { alt: 'x', size: 'lg' } })
    expect(sm.classes()).toContain('h-12')
    expect(lg.classes()).toContain('h-16')
  })
})

describe('WishlistItemActions', () => {
  const mounted: { unmount: () => void }[] = []

  // The menu renders into a portal on document.body, so without teardown a
  // previous test's entries would still be found by the next one.
  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
    document.body.innerHTML = ''
  })

  /** Opens the overflow menu and returns its rendered entries. */
  async function openMenu(props: { item: WishlistItem }) {
    const w = mount(WishlistItemActions, { props, attachTo: document.body })
    mounted.push(w)
    const buttons = w.findAll('button')
    await buttons[buttons.length - 1]!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))

    const entries = [
      ...document.querySelectorAll('[role="menuitem"]'),
    ] as HTMLElement[]

    return { wrapper: w, entries, text: document.body.textContent ?? '' }
  }

  test('offers to mark an unpurchased item as bought', async () => {
    const { text } = await openMenu({ item: item() })
    expect(text).toContain('Als gekauft markieren')
    expect(text).not.toContain('Rückgängig machen')
  })

  test('offers to undo a purchased item', async () => {
    const { text } = await openMenu({ item: item({ isPurchased: true }) })
    expect(text).toContain('Rückgängig machen')
    expect(text).not.toContain('Als gekauft markieren')
  })

  test('flips the active toggle wording with state', async () => {
    const active = await openMenu({ item: item() })
    expect(active.text).toContain('Deaktivieren')

    const inactive = await openMenu({ item: item({ isActive: false }) })
    expect(inactive.text).toContain('Aktivieren')
  })

  test('toggles purchase to the opposite of the current state', async () => {
    const { wrapper, entries } = await openMenu({
      item: item({ isPurchased: true }),
    })
    const undo = entries.find((e) => e.textContent?.includes('Rückgängig'))!
    undo.click()

    expect(wrapper.emitted('togglePurchased')?.[0]).toEqual(['item-1', false])
  })

  test('toggles active to the opposite of the current state', async () => {
    const { wrapper, entries } = await openMenu({
      item: item({ isActive: false }),
    })
    const activate = entries.find((e) => e.textContent?.includes('Aktivieren'))!
    activate.click()

    expect(wrapper.emitted('toggleActive')?.[0]).toEqual(['item-1', true])
  })

  test('emits openUrl with the item url', async () => {
    const w = mount(WishlistItemActions, { props: { item: item() } })
    await w.find('button').trigger('click')
    expect(w.emitted('openUrl')?.[0]).toEqual(['https://example.com/p/1'])
  })

  test('hides the link button when the item has no url', () => {
    const w = mount(WishlistItemActions, {
      props: { item: item({ url: '' }) },
    })
    expect(w.text()).not.toContain('Link')
  })
})

describe('WishlistItemsPagination', () => {
  test('describes the visible range', () => {
    const w = mount(WishlistItemsPagination, {
      props: { offset: 0, limit: 20, total: 45, hasMore: true },
    })
    expect(w.text()).toContain('Zeige 1 bis 20 von 45 Artikeln')
  })

  test('clamps the upper bound to the total on the last page', () => {
    const w = mount(WishlistItemsPagination, {
      props: { offset: 40, limit: 20, total: 45, hasMore: false },
    })
    expect(w.text()).toContain('Zeige 41 bis 45 von 45 Artikeln')
  })

  test('disables previous on the first page and next on the last', () => {
    const first = mount(WishlistItemsPagination, {
      props: { offset: 0, limit: 20, total: 45, hasMore: true },
    })
    const buttons = first.findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeUndefined()

    const last = mount(WishlistItemsPagination, {
      props: { offset: 40, limit: 20, total: 45, hasMore: false },
    })
    const lastButtons = last.findAll('button')
    expect(lastButtons[0]!.attributes('disabled')).toBeUndefined()
    expect(lastButtons[1]!.attributes('disabled')).toBeDefined()
  })

  test('emits page navigation', async () => {
    const w = mount(WishlistItemsPagination, {
      props: { offset: 20, limit: 20, total: 45, hasMore: true },
    })
    const buttons = w.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(w.emitted('previous')).toHaveLength(1)
    expect(w.emitted('next')).toHaveLength(1)
  })
})
