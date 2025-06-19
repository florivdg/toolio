import {
  defineQueryOptions,
  useMutation,
  useQuery,
  useQueryCache,
} from '@pinia/colada'
import { computed } from 'vue'

// Query Keys Factory
export const WISHLIST_QUERY_KEYS = {
  root: ['wishlists'] as const,
  list: (params: { limit?: number; offset?: number } = {}) =>
    [...WISHLIST_QUERY_KEYS.root, 'list', params] as const,
  byId: (id: string) => [...WISHLIST_QUERY_KEYS.root, id] as const,
  items: (
    wishlistId: string,
    params: { limit?: number; offset?: number } = {},
  ) => [...WISHLIST_QUERY_KEYS.byId(wishlistId), 'items', params] as const,
}

// Types
export interface WishlistItem {
  id: string
  wishlistId: string
  name: string
  description?: string
  price?: number
  url: string
  imageUrl?: string
  isActive: boolean
  isPurchased: boolean
  priority?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: string | Date
  updatedAt?: string | Date
  itemCount?: number
  latestItems?: WishlistItem[]
}

interface WishlistsResponse {
  success: boolean
  data: Wishlist[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface WishlistItemsResponse {
  success: boolean
  data: WishlistItem[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface WishlistResponse {
  success: boolean
  data: Wishlist
}

interface WishlistItemResponse {
  success: boolean
  data: WishlistItem
}

// Helper for API response validation
function validateApiResponse<T extends { success: boolean }>(
  data: T,
  errorMessage = 'API returned success: false',
): T {
  if (!data.success) {
    throw new Error(errorMessage)
  }
  return data
}

// API Functions
const fetchWishlists = async (
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 12, offset = 0 } = params
  const response = await fetch(`/api/wishlists?limit=${limit}&offset=${offset}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistsResponse = await response.json()
  validateApiResponse(data)
  return data
}

const fetchWishlist = async (id: string) => {
  const response = await fetch(`/api/wishlists/${id}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistResponse = await response.json()
  validateApiResponse(data)
  return data.data
}

const fetchWishlistItems = async (
  wishlistId: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const { limit = 20, offset = 0 } = params
  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(
    `/api/wishlists/${wishlistId}/items?${searchParams}`,
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistItemsResponse = await response.json()
  validateApiResponse(data)
  return data
}

// Query Options
export const wishlistsQuery = defineQueryOptions(
  (params: { limit?: number; offset?: number } = {}) => ({
    key: WISHLIST_QUERY_KEYS.list(params),
    query: () => fetchWishlists(params),
  }),
)

export const wishlistQuery = defineQueryOptions(({ id }: { id: string }) => ({
  key: WISHLIST_QUERY_KEYS.byId(id),
  query: () => fetchWishlist(id),
}))

export const wishlistItemsQuery = defineQueryOptions(
  ({
    wishlistId,
    params = {},
  }: {
    wishlistId: string
    params?: { limit?: number; offset?: number }
  }) => ({
    key: WISHLIST_QUERY_KEYS.items(wishlistId, params),
    query: () => fetchWishlistItems(wishlistId, params),
  }),
)

// Reusable Query Composables
export const useWishlists = (
  params: { limit?: number; offset?: number } = {},
) => {
  const { state, asyncStatus, refresh, ...rest } = useQuery(
    wishlistsQuery(params),
  )

  return {
    wishlists: state,
    loading: computed(() => asyncStatus.value === 'loading'),
    refresh,
    ...rest,
  }
}

export const useWishlist = (id: string) => {
  const { state, asyncStatus, refresh, ...rest } = useQuery(
    wishlistQuery({ id }),
  )

  return {
    wishlist: state,
    loading: computed(() => asyncStatus.value === 'loading'),
    refresh,
    ...rest,
  }
}

export const useWishlistItems = ({
  wishlistId,
  params = {},
}: {
  wishlistId: string
  params?: { limit?: number; offset?: number }
}) => {
  const { state, asyncStatus, refresh, ...rest } = useQuery(
    wishlistItemsQuery({ wishlistId, params }),
  )

  return {
    itemsData: state,
    items: computed(() => state.value.data?.data || []),
    pagination: computed(() => state.value.data?.pagination),
    loading: computed(() => asyncStatus.value === 'loading'),
    refresh,
    ...rest,
  }
}

// Mutation Functions
export const createWishlist = async (wishlist: {
  name: string
  description?: string
}) => {
  const response = await fetch('/api/wishlists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wishlist),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistResponse = await response.json()
  validateApiResponse(data)
  return data.data
}

export const updateWishlist = async ({
  id,
  ...updates
}: {
  id: string
  name?: string
  description?: string
}) => {
  const response = await fetch(`/api/wishlists/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistResponse = await response.json()
  validateApiResponse(data)
  return data.data
}

export const deleteWishlist = async (id: string) => {
  const response = await fetch(`/api/wishlists/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.message || 'API returned success: false')
  }

  return data
}

export const createWishlistItem = async (
  wishlistId: string,
  item: {
    name: string
    description?: string
    price?: number
    url: string
    imageUrl?: string
    priority?: number
    notes?: string
  },
) => {
  const response = await fetch(`/api/wishlists/${wishlistId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistItemResponse = await response.json()
  validateApiResponse(data)
  return data.data
}

export const updateWishlistItem = async ({
  wishlistId,
  itemId,
  ...updates
}: {
  wishlistId: string
  itemId: string
  name?: string
  description?: string
  price?: number
  url?: string
  imageUrl?: string
  priority?: number
  notes?: string
}) => {
  const response = await fetch(`/api/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data: WishlistItemResponse = await response.json()
  validateApiResponse(data)
  return data.data
}

export const deleteWishlistItem = async (
  wishlistId: string,
  itemId: string,
) => {
  const response = await fetch(`/api/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.message || 'API returned success: false')
  }

  return data
}

export const toggleWishlistItemPurchased = async (
  wishlistId: string,
  itemId: string,
  isPurchased: boolean,
) => {
  const response = await fetch(
    `/api/wishlists/${wishlistId}/items/${itemId}/purchase`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPurchased }),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  validateApiResponse(data)
  return data
}

export const toggleWishlistItemActive = async (
  wishlistId: string,
  itemId: string,
  isActive: boolean,
) => {
  const response = await fetch(
    `/api/wishlists/${wishlistId}/items/${itemId}/active`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  validateApiResponse(data)
  return data
}

// Mutation Composables with Query Invalidation
export const useCreateWishlistMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: createWishlist,
    async onSettled() {
      await queryCache.invalidateQueries({ key: WISHLIST_QUERY_KEYS.root })
      await queryCache.invalidateQueries({ key: ['wishlists', 'sidebar'] })
    },
  })
}

export const useUpdateWishlistMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: updateWishlist,
    async onSettled(data) {
      if (data) {
        await queryCache.invalidateQueries({
          key: WISHLIST_QUERY_KEYS.byId(data.id),
        })
        await queryCache.invalidateQueries({ key: WISHLIST_QUERY_KEYS.root })
        await queryCache.invalidateQueries({ key: ['wishlists', 'sidebar'] })
      }
    },
  })
}

export const useDeleteWishlistMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: deleteWishlist,
    async onSuccess(data, wishlistId) {
      // Only invalidate on success
      await queryCache.invalidateQueries({ key: WISHLIST_QUERY_KEYS.root })
      await queryCache.invalidateQueries({ key: ['wishlists', 'sidebar'] })
      await queryCache.invalidateQueries({
        key: WISHLIST_QUERY_KEYS.byId(wishlistId),
      })
    },
  })
}

export const useCreateWishlistItemMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      ...item
    }: { wishlistId: string } & Parameters<typeof createWishlistItem>[1]) =>
      createWishlistItem(wishlistId, item),
    async onSettled(data) {
      if (data) {
        await queryCache.invalidateQueries({
          key: [...WISHLIST_QUERY_KEYS.byId(data.wishlistId), 'items'],
        })
        await queryCache.invalidateQueries({
          key: WISHLIST_QUERY_KEYS.byId(data.wishlistId),
        })
        await queryCache.invalidateQueries({ key: WISHLIST_QUERY_KEYS.root })
        await queryCache.invalidateQueries({ key: ['wishlists', 'sidebar'] })
      }
    },
  })
}

export const useUpdateWishlistItemMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: updateWishlistItem,
    async onSettled(data) {
      if (data) {
        await queryCache.invalidateQueries({
          key: [...WISHLIST_QUERY_KEYS.byId(data.wishlistId), 'items'],
        })
        await queryCache.invalidateQueries({
          key: WISHLIST_QUERY_KEYS.byId(data.wishlistId),
        })
      }
    },
  })
}

export const useDeleteWishlistItemMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
    }: {
      wishlistId: string
      itemId: string
    }) => deleteWishlistItem(wishlistId, itemId),
    async onSettled(data, error, variables) {
      await queryCache.invalidateQueries({
        key: [...WISHLIST_QUERY_KEYS.byId(variables.wishlistId), 'items'],
      })
      await queryCache.invalidateQueries({
        key: WISHLIST_QUERY_KEYS.byId(variables.wishlistId),
      })
      await queryCache.invalidateQueries({ key: WISHLIST_QUERY_KEYS.root })
      await queryCache.invalidateQueries({ key: ['wishlists', 'sidebar'] })
    },
  })
}

export const useToggleWishlistItemPurchasedMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
      isPurchased,
    }: {
      wishlistId: string
      itemId: string
      isPurchased: boolean
    }) => toggleWishlistItemPurchased(wishlistId, itemId, isPurchased),
    async onSettled(data, error, variables) {
      await queryCache.invalidateQueries({
        key: [...WISHLIST_QUERY_KEYS.byId(variables.wishlistId), 'items'],
      })
    },
  })
}

export const useToggleWishlistItemActiveMutation = () => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({
      wishlistId,
      itemId,
      isActive,
    }: {
      wishlistId: string
      itemId: string
      isActive: boolean
    }) => toggleWishlistItemActive(wishlistId, itemId, isActive),
    async onSettled(data, error, variables) {
      await queryCache.invalidateQueries({
        key: [...WISHLIST_QUERY_KEYS.byId(variables.wishlistId), 'items'],
      })
    },
  })
}
