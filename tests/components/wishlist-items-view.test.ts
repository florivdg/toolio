import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { ref } from 'vue'

/**
 * Covers the async state machine of WishlistItemsView: which of the loading,
 * error, empty and populated branches renders. The queries and router are
 * replaced so the component can be mounted without a server or a Pinia store.
 *
 * These mocks must be registered before the component is imported, so the
 * import is dynamic and happens inside the tests.
 */

const wishlist = ref<Record<string, unknown> | null>(null)
const wishlistLoading = ref(false)
const wishlistError = ref<Error | null>(null)

const itemsResponse = ref<Record<string, unknown> | null>(null)
const itemsLoading = ref(false)
const itemsError = ref<Error | null>(null)

const push = mock(() => {})
const noopMutation = () => ({ mutateAsync: mock(async () => ({})) })

mock.module('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: { id: 'list-1' } }),
}))

mock.module('vue-sonner', () => ({
  toast: { success: mock(() => {}), error: mock(() => {}) },
}))

mock.module('@/lib/wishlists/queries', () => ({
  useWishlistQuery: () => ({
    data: wishlist,
    isLoading: wishlistLoading,
    error: wishlistError,
  }),
  useWishlistItemsQuery: () => ({
    data: itemsResponse,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: mock(() => {}),
  }),
  useWishlistsQuery: () => ({
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
  }),
  // The mock replaces the whole module, so every export the component graph
  // imports has to be present or the import fails at load time.
  useCreateWishlistMutation: noopMutation,
  useUpdateWishlistMutation: noopMutation,
  useDeleteWishlistMutation: noopMutation,
  useCreateWishlistItemMutation: noopMutation,
  useUpdateWishlistItemMutation: noopMutation,
  useDeleteWishlistItemMutation: noopMutation,
  useUpdateWishlistItemStatusMutation: noopMutation,
  useMoveWishlistItemMutation: noopMutation,
}))

function pagination(total: number) {
  return { limit: 20, offset: 0, total, hasMore: total > 20 }
}

function anItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    wishlistId: 'list-1',
    name: 'Kaffeemühle',
    url: 'https://example.com/p/1',
    isActive: true,
    isPurchased: false,
    price: 10,
    ...overrides,
  }
}

async function mountView() {
  const { mount } = await import('@vue/test-utils')
  const View = (
    await import('@/components/wishlists/WishlistItemsView.vue')
  ).default

  return mount(View, {
    global: {
      // The children have their own tests; stubbing them keeps this focused on
      // which branch renders.
      stubs: {
        WishlistItemsHeader: true,
        WishlistItemsTable: true,
        CreateWishlistItemModal: true,
        EditWishlistItemModal: true,
        EditWishlistModal: true,
        MoveWishlistItemDialog: true,
        ConfirmDeleteDialog: true,
      },
    },
  })
}

describe('WishlistItemsView state machine', () => {
  beforeEach(() => {
    wishlist.value = { id: 'list-1', name: 'Umzug', description: 'Ideen' }
    wishlistLoading.value = false
    wishlistError.value = null
    itemsResponse.value = { data: [], pagination: pagination(0) }
    itemsLoading.value = false
    itemsError.value = null
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('shows skeletons while items are loading', async () => {
    itemsLoading.value = true
    const w = await mountView()

    expect(w.findAll('.animate-pulse')).toHaveLength(3)
    expect(w.findComponent({ name: 'WishlistItemsTable' }).exists()).toBe(false)
  })

  test('shows skeletons while the wishlist itself is loading', async () => {
    wishlistLoading.value = true
    const w = await mountView()

    expect(w.findAll('.animate-pulse')).toHaveLength(3)
  })

  test('shows the error branch and surfaces the message', async () => {
    itemsError.value = new Error('Netzwerk kaputt')
    const w = await mountView()

    expect(w.text()).toContain('Fehler beim Laden')
    expect(w.text()).toContain('Netzwerk kaputt')
  })

  test('prefers the items error over the wishlist error', async () => {
    itemsError.value = new Error('Artikel-Fehler')
    wishlistError.value = new Error('Wunschlisten-Fehler')
    const w = await mountView()

    expect(w.text()).toContain('Artikel-Fehler')
    expect(w.text()).not.toContain('Wunschlisten-Fehler')
  })

  test('falls back to the wishlist error when items loaded fine', async () => {
    wishlistError.value = new Error('Wunschlisten-Fehler')
    const w = await mountView()

    expect(w.text()).toContain('Wunschlisten-Fehler')
  })

  test('shows the empty state when there are no items', async () => {
    const w = await mountView()

    expect(w.text()).toContain('Keine Artikel vorhanden')
    expect(w.findComponent({ name: 'WishlistItemsTable' }).exists()).toBe(false)
  })

  test('renders the table once items exist', async () => {
    itemsResponse.value = { data: [anItem()], pagination: pagination(1) }
    const w = await mountView()

    expect(w.text()).not.toContain('Keine Artikel vorhanden')
    expect(w.findComponent({ name: 'WishlistItemsTable' }).exists()).toBe(true)
  })

  test('loading wins over an error', async () => {
    itemsLoading.value = true
    itemsError.value = new Error('egal')
    const w = await mountView()

    expect(w.findAll('.animate-pulse')).toHaveLength(3)
    expect(w.text()).not.toContain('Fehler beim Laden')
  })

  test('passes the price totals to the table', async () => {
    itemsResponse.value = {
      data: [
        anItem({ id: 'a', price: 10 }),
        anItem({ id: 'b', price: 5, isPurchased: true }),
      ],
      pagination: pagination(2),
    }
    const w = await mountView()
    const table = w.findComponent({ name: 'WishlistItemsTable' })

    // Total counts every item; the active sum excludes purchased ones.
    expect(table.props('totalSum')).toBe(15)
    expect(table.props('activeSum')).toBe(10)
  })
})
