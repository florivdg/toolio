import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { wishlistKeys } from './queryKeys'
import type { Wishlist, WishlistItem } from '@/db/schema/wishlists'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { fetchData, fetchEnvelope, jsonBody } from '@/lib/api/client'
import { withItemDefaults } from './normalize'
import type { WishlistWithItems } from './normalize'

// Re-exported so components keep importing it from the module they already use.
export type { WishlistWithItems }

interface Pagination {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

interface WishlistsResponse {
  success: boolean
  data: WishlistWithItems[]
  pagination: Pagination
}

interface WishlistItemsResponse {
  success: boolean
  data: WishlistItem[]
  pagination: Pagination
}

interface CreateWishlistData {
  name: string
  description?: string
}

interface UpdateWishlistData {
  name?: string
  description?: string
}

interface CreateWishlistItemData {
  name: string
  description?: string
  price?: number
  url: string
  imageUrl?: string
  priority?: number
  notes?: string
}

interface UpdateWishlistItemData {
  name?: string
  description?: string
  price?: number
  url?: string
  imageUrl?: string
  isActive?: boolean
  isPurchased?: boolean
  priority?: number
  notes?: string
}

const STALE_TIME = 60000 // 1 minute

/** Every item mutation refreshes the same three views of a wishlist. */
function invalidateWishlist(
  queryCache: ReturnType<typeof useQueryCache>,
  wishlistId: string,
) {
  void queryCache.invalidateQueries({ key: wishlistKeys.items(wishlistId) })
  void queryCache.invalidateQueries({ key: wishlistKeys.detail(wishlistId) })
  void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
}

// Query Functions
export function useWishlistsQuery(limit = 20, offset = 0) {
  return useQuery({
    key: wishlistKeys.list({ limit, offset }),
    query: () =>
      fetchEnvelope<WishlistsResponse>(
        `/api/wishlists?limit=${limit}&offset=${offset}`,
      ),
    staleTime: STALE_TIME,
  })
}

export function useWishlistQuery(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => wishlistKeys.detail(toValue(id)),
    query: () => fetchData<Wishlist>(`/api/wishlists/${toValue(id)}`),
    staleTime: STALE_TIME,
  })
}

export function useWishlistItemsQuery(
  wishlistId: MaybeRefOrGetter<string>,
  limit = 20,
  offset = 0,
) {
  return useQuery({
    key: () =>
      wishlistKeys.itemsWithFilters(toValue(wishlistId), { limit, offset }),
    query: () =>
      fetchEnvelope<WishlistItemsResponse>(
        `/api/wishlists/${toValue(wishlistId)}/items?limit=${limit}&offset=${offset}`,
      ),
    staleTime: STALE_TIME,
  })
}

// Mutation Functions
export function useCreateWishlistMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (data: CreateWishlistData) =>
      fetchData<WishlistWithItems>(
        '/api/wishlists',
        jsonBody('POST', data),
      ).then(withItemDefaults),
    onSuccess: () => {
      // Invalidate all wishlist list queries
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

export function useUpdateWishlistMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id, data }: { id: string; data: UpdateWishlistData }) =>
      fetchData<Wishlist>(`/api/wishlists/${id}`, jsonBody('PUT', data)),
    onSuccess: (_, { id }) => {
      // Invalidate specific wishlist and the list
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(id) })
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

export function useDeleteWishlistMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) =>
      fetchData<{ deletedId: string }>(`/api/wishlists/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      // Invalidate wishlist list queries and the specific detail query
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(id) })
    },
  })
}

export function useCreateWishlistItemMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      data,
    }: {
      wishlistId: string
      data: CreateWishlistItemData
    }) =>
      fetchData<WishlistItem>(
        `/api/wishlists/${wishlistId}/items`,
        jsonBody('POST', data),
      ),
    onSuccess: (_, { wishlistId }) => invalidateWishlist(queryCache, wishlistId),
  })
}

export function useUpdateWishlistItemMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
      data,
    }: {
      wishlistId: string
      itemId: string
      data: UpdateWishlistItemData
    }) =>
      fetchData<WishlistItem>(
        `/api/wishlists/${wishlistId}/items/${itemId}`,
        jsonBody('PUT', data),
      ),
    onSuccess: (_, { wishlistId }) => invalidateWishlist(queryCache, wishlistId),
  })
}

export function useDeleteWishlistItemMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
    }: {
      wishlistId: string
      itemId: string
    }) =>
      fetchData<{ deletedId: string }>(
        `/api/wishlists/${wishlistId}/items/${itemId}`,
        { method: 'DELETE' },
      ),
    onSuccess: (_, { wishlistId }) => invalidateWishlist(queryCache, wishlistId),
  })
}

// Specialized mutations for item status updates
export function useUpdateWishlistItemStatusMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
      status,
      value,
    }: {
      wishlistId: string
      itemId: string
      status: 'active' | 'purchase'
      value: boolean
    }) =>
      fetchData<WishlistItem>(
        `/api/wishlists/${wishlistId}/items/${itemId}/${status}`,
        jsonBody('PATCH', {
          [status === 'active' ? 'isActive' : 'isPurchased']: value,
        }),
      ),
    onSuccess: (_, { wishlistId }) => invalidateWishlist(queryCache, wishlistId),
  })
}

export function useMoveWishlistItemMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      fromWishlistId,
      itemId,
      toWishlistId,
    }: {
      fromWishlistId: string
      toWishlistId: string
      itemId: string
    }) =>
      fetchData<WishlistItem>(
        `/api/wishlists/${fromWishlistId}/items/${itemId}/move`,
        jsonBody('PATCH', { targetWishlistId: toWishlistId }),
      ),
    onSuccess: (_, { fromWishlistId, toWishlistId }) => {
      // Invalidate both source and destination wishlists. Spelled out rather
      // than calling the helper twice, so the shared lists() key is only
      // invalidated once.
      for (const id of [fromWishlistId, toWishlistId]) {
        void queryCache.invalidateQueries({ key: wishlistKeys.items(id) })
        void queryCache.invalidateQueries({ key: wishlistKeys.detail(id) })
      }
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}
