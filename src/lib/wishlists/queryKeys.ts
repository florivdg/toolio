/**
 * Query keys for wishlists data fetching
 * 
 * This follows the recommended pattern from TanStack Query for hierarchical query keys
 * to enable efficient cache invalidation and data consistency
 */

export const wishlistKeys = {
  all: ['wishlists'] as const,
  lists: () => [...wishlistKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) => 
    [...wishlistKeys.lists(), filters] as const,
  details: () => [...wishlistKeys.all, 'detail'] as const,
  detail: (id: string) => [...wishlistKeys.details(), id] as const,
  items: (wishlistId: string) => 
    [...wishlistKeys.detail(wishlistId), 'items'] as const,
  itemsWithFilters: (wishlistId: string, filters: { limit?: number; offset?: number }) =>
    [...wishlistKeys.items(wishlistId), filters] as const,
}