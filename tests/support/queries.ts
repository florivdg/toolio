import { mock } from 'bun:test'
import { ref } from 'vue'

/**
 * One stub of the wishlist query module for every test file.
 *
 * `mock.module` is process-global: two files registering their own stub would
 * clobber each other depending on load order, and the loser would see a module
 * missing the exports its component graph imports. Tests drive the refs below
 * instead of registering their own mock.
 */

function queryStub() {
  return {
    data: ref<any>(null),
    isLoading: ref(false),
    error: ref<Error | null>(null),
    refetch: mock(async () => {}),
  }
}

export const wishlistsQuery = queryStub()
export const wishlistQuery = queryStub()
export const itemsQuery = queryStub()

/** Every mutation the components call, recording what it was asked to do. */
const mutations = {
  createWishlist: mock(async () => ({})),
  updateWishlist: mock(async () => ({})),
  deleteWishlist: mock(async () => ({})),
  createItem: mock(async () => ({})),
  updateItem: mock(async () => ({})),
  deleteItem: mock(async () => ({})),
  updateItemStatus: mock(async () => ({})),
  moveItem: mock(async () => ({})),
}

/** Mutations are exposed under both names the components use. */
function mutationStub(fn: (...args: any[]) => Promise<unknown>) {
  return () => ({ mutate: fn, mutateAsync: fn })
}

mock.module('@/lib/wishlists/queries', () => ({
  useWishlistsQuery: () => wishlistsQuery,
  useWishlistQuery: () => wishlistQuery,
  useWishlistItemsQuery: () => itemsQuery,
  useCreateWishlistMutation: mutationStub(mutations.createWishlist),
  useUpdateWishlistMutation: mutationStub(mutations.updateWishlist),
  useDeleteWishlistMutation: mutationStub(mutations.deleteWishlist),
  useCreateWishlistItemMutation: mutationStub(mutations.createItem),
  useUpdateWishlistItemMutation: mutationStub(mutations.updateItem),
  useDeleteWishlistItemMutation: mutationStub(mutations.deleteItem),
  useUpdateWishlistItemStatusMutation: mutationStub(mutations.updateItemStatus),
  useMoveWishlistItemMutation: mutationStub(mutations.moveItem),
}))

/** Puts every query back to "loaded, empty" and forgets recorded calls. */
export function resetQueries() {
  for (const query of [wishlistsQuery, wishlistQuery, itemsQuery]) {
    query.data.value = null
    query.isLoading.value = false
    query.error.value = null
    query.refetch.mockClear()
  }

  for (const mutation of Object.values(mutations)) mutation.mockClear()
}
