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

const MUTATION_NAMES = [
  'createWishlist',
  'updateWishlist',
  'deleteWishlist',
  'createItem',
  'updateItem',
  'deleteItem',
  'updateItemStatus',
  'moveItem',
] as const

type MutationName = (typeof MUTATION_NAMES)[number]

/** What each mutation was asked to do, in order. */
export const mutationCalls = Object.fromEntries(
  MUTATION_NAMES.map((name) => [name, [] as unknown[]]),
) as Record<MutationName, unknown[]>

/** Errors queued by `rejectNext`, one per mutation. */
const pendingRejections = new Map<MutationName, unknown>()

/** Make the next call to a mutation reject, then go back to succeeding. */
export function rejectNext(name: MutationName, error: unknown) {
  pendingRejections.set(name, error)
}

/** Mutations are exposed under both names the components use. */
function mutationStub(name: MutationName) {
  const run = async (variables?: unknown) => {
    mutationCalls[name].push(variables)

    if (pendingRejections.has(name)) {
      const error = pendingRejections.get(name)
      pendingRejections.delete(name)
      throw error
    }

    // Components read the result, so hand back something wishlist-shaped.
    return { id: 'w1', name: 'Ergebnis' }
  }

  return () => ({ mutate: run, mutateAsync: run })
}

mock.module('@/lib/wishlists/queries', () => ({
  useWishlistsQuery: () => wishlistsQuery,
  useWishlistQuery: () => wishlistQuery,
  useWishlistItemsQuery: () => itemsQuery,
  useCreateWishlistMutation: mutationStub('createWishlist'),
  useUpdateWishlistMutation: mutationStub('updateWishlist'),
  useDeleteWishlistMutation: mutationStub('deleteWishlist'),
  useCreateWishlistItemMutation: mutationStub('createItem'),
  useUpdateWishlistItemMutation: mutationStub('updateItem'),
  useDeleteWishlistItemMutation: mutationStub('deleteItem'),
  useUpdateWishlistItemStatusMutation: mutationStub('updateItemStatus'),
  useMoveWishlistItemMutation: mutationStub('moveItem'),
}))

/** Puts every query back to "loaded, empty" and forgets recorded calls. */
export function resetQueries() {
  for (const query of [wishlistsQuery, wishlistQuery, itemsQuery]) {
    query.data.value = null
    query.isLoading.value = false
    query.error.value = null
    query.refetch.mockClear()
  }

  for (const name of MUTATION_NAMES) mutationCalls[name].length = 0
  pendingRejections.clear()
}
