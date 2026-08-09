import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { wishlistKeys } from './queryKeys'
import type { Wishlist, WishlistItem } from '@/db/schema/wishlists'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

// Extended types for API responses
export interface WishlistWithItems extends Wishlist {
  itemCount?: number
  latestItems?: Partial<WishlistItem>[]
}

interface WishlistsResponse {
  success: boolean
  data: WishlistWithItems[]
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

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
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

// Query Functions
export function useWishlistsQuery(limit = 20, offset = 0) {
  return useQuery({
    key: wishlistKeys.list({ limit, offset }),
    query: () => 
      fetch(`/api/wishlists?limit=${limit}&offset=${offset}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then((data: WishlistsResponse) => {
          if (!data.success) {
            throw new Error('API returned success: false')
          }
          return data
        }),
    staleTime: 60000, // 1 minute
  })
}

export function useWishlistQuery(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => wishlistKeys.detail(toValue(id)),
    query: async () => {
      const idValue = toValue(id)
      const res = await fetch(`/api/wishlists/${idValue}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = (await res.json()) as ApiResponse<Wishlist>
      if (!data.success) {
        throw new Error('API returned success: false')
      }
      return data.data
    },
    staleTime: 60000,
  })
}

export function useWishlistItemsQuery(wishlistId: MaybeRefOrGetter<string>, limit = 20, offset = 0) {
  return useQuery({
    key: () => wishlistKeys.itemsWithFilters(toValue(wishlistId), { limit, offset }),
    query: async () => {
      const wishlistIdValue = toValue(wishlistId)
      const res = await fetch(`/api/wishlists/${wishlistIdValue}/items?limit=${limit}&offset=${offset}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = (await res.json()) as WishlistItemsResponse
      if (!data.success) {
        throw new Error('API returned success: false')
      }
      return data
    },
    staleTime: 60000,
  })
}

// Mutation Functions
export function useCreateWishlistMutation() {
  const queryCache = useQueryCache()
  
  return useMutation({
    mutation: (data: CreateWishlistData) => 
      fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<Wishlist>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        const wishlist = data.data
        if (!wishlist?.id) {
          throw new Error('API-Antwort enthält keine Wishlist-ID')
        }
        const withExtras: WishlistWithItems = {
          ...(wishlist as WishlistWithItems),
          itemCount: (wishlist as WishlistWithItems).itemCount ?? 0,
          latestItems: (wishlist as WishlistWithItems).latestItems ?? [],
        }
        return withExtras
  }),
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
      fetch(`/api/wishlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<Wishlist>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
      }),
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
      fetch(`/api/wishlists/${id}`, {
        method: 'DELETE',
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<{ deletedId: string }>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
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
    mutation: ({ wishlistId, data }: { wishlistId: string; data: CreateWishlistItemData }) => 
      fetch(`/api/wishlists/${wishlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<WishlistItem>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
      }),
    onSuccess: (_, { wishlistId }) => {
      // Invalidate items list and the parent wishlist
      void queryCache.invalidateQueries({ key: wishlistKeys.items(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

export function useUpdateWishlistItemMutation() {
  const queryCache = useQueryCache()
  
  return useMutation({
    mutation: ({ wishlistId, itemId, data }: { wishlistId: string; itemId: string; data: UpdateWishlistItemData }) => 
      fetch(`/api/wishlists/${wishlistId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<WishlistItem>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
      }),
    onSuccess: (_, { wishlistId }) => {
      void queryCache.invalidateQueries({ key: wishlistKeys.items(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

export function useDeleteWishlistItemMutation() {
  const queryCache = useQueryCache()
  
  return useMutation({
    mutation: ({ wishlistId, itemId }: { wishlistId: string; itemId: string }) => 
      fetch(`/api/wishlists/${wishlistId}/items/${itemId}`, {
        method: 'DELETE',
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<{ deletedId: string }>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
      }),
    onSuccess: (_, { wishlistId }) => {
      void queryCache.invalidateQueries({ key: wishlistKeys.items(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

// Specialized mutations for item status updates
export function useUpdateWishlistItemStatusMutation() {
  const queryCache = useQueryCache()
  
  return useMutation({
    mutation: ({ wishlistId, itemId, status, value }: { 
      wishlistId: string; 
      itemId: string; 
      status: 'active' | 'purchase';
      value: boolean;
    }) => 
      fetch(`/api/wishlists/${wishlistId}/items/${itemId}/${status}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [status === 'active' ? 'isActive' : 'isPurchased']: value }),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<WishlistItem>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
      }),
    onSuccess: (_, { wishlistId }) => {
      void queryCache.invalidateQueries({ key: wishlistKeys.items(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.detail(wishlistId) })
      void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
    },
  })
}

export function useMoveWishlistItemMutation() {
  const queryCache = useQueryCache()
  
  return useMutation({
    mutation: ({ 
      fromWishlistId, 
      toWishlistId, 
      itemId 
    }: { 
      fromWishlistId: string; 
      toWishlistId: string; 
      itemId: string 
    }) => 
      fetch(`/api/wishlists/${fromWishlistId}/items/${itemId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWishlistId: toWishlistId }),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: ApiResponse<WishlistItem>) => {
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false')
        }
        return data.data
  }),
  onSuccess: (_, { fromWishlistId, toWishlistId }) => {
    // Invalidate both source and destination wishlists
    void queryCache.invalidateQueries({ key: wishlistKeys.items(fromWishlistId) })
    void queryCache.invalidateQueries({ key: wishlistKeys.items(toWishlistId) })
    void queryCache.invalidateQueries({ key: wishlistKeys.detail(fromWishlistId) })
    void queryCache.invalidateQueries({ key: wishlistKeys.detail(toWishlistId) })
    void queryCache.invalidateQueries({ key: wishlistKeys.lists() })
  },
})
}
