<script setup lang="ts">
import { computed, provide } from 'vue'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { FileText, List } from 'lucide-vue-next'
import { useQuery } from '@pinia/colada'

// Types
interface Wishlist {
  id: string
  name: string
  description?: string
  itemCount?: number
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

// API function for sidebar
const fetchWishlistsForSidebar = async () => {
  const response = await fetch('/api/wishlists?limit=50') // Get more for sidebar
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const data: WishlistsResponse = await response.json()
  
  if (!data.success) {
    throw new Error('API returned success: false')
  }
  
  return data.data
}

// Use Pinia Colada for sidebar data fetching
const { data: wishlistsData, error, isPending: loading, refresh: refetchWishlists } = useQuery({
  key: ['wishlists', 'sidebar'], // Different key for sidebar to avoid conflicts
  query: fetchWishlistsForSidebar,
})

// Computed values
const wishlists = computed(() => wishlistsData.value || [])

// Refresh sidebar when wishlists change
const refreshSidebar = () => {
  refetchWishlists()
}

// Provide refresh function to child components
provide('refreshSidebar', refreshSidebar)
</script>

<template>
  <Toaster />
  <div class="@container">
    <div class="grid grid-cols-1 gap-4 @3xl:grid-cols-[auto_1fr]">
      <nav
        data-allow-mismatch
        class="flex grow-0 flex-col gap-2 @3xl:max-w-80 @3xl:min-w-64"
      >
        <!-- All Wishlists Link -->
        <router-link
          to="/tools/wishlists"
          custom
          v-slot="{ isExactActive, href, navigate }"
        >
          <Button
            asChild
            :variant="isExactActive ? 'default' : 'secondary'"
            @click="navigate"
            class="justify-start"
          >
            <a :href="href" class="flex items-center gap-2">
              <List class="h-4 w-4 flex-shrink-0" />
              <span class="truncate">Alle Wishlists</span>
            </a>
          </Button>
        </router-link>

        <!-- Separator -->
        <div
          v-if="wishlists.length > 0"
          class="border-border my-2 border-t"
        ></div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="bg-muted h-9 rounded"></div>
          </div>
        </div>

        <!-- Individual Wishlist Links -->
        <div v-else-if="wishlists.length > 0" class="space-y-1">
          <div class="px-2 py-1">
            <span
              class="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Meine Listen
            </span>
          </div>
          <router-link
            v-for="wishlist in wishlists"
            :key="wishlist.id"
            :to="`/tools/wishlists/${wishlist.id}`"
            custom
            v-slot="{ isActive, href, navigate }"
          >
            <Button
              asChild
              :variant="isActive ? 'default' : 'ghost'"
              size="sm"
              @click="navigate"
              class="w-full min-w-0 justify-start"
            >
              <a
                :href="href"
                class="flex min-w-0 items-center gap-2"
                :title="wishlist.name"
              >
                <FileText class="h-3 w-3 flex-shrink-0" />
                <span class="min-w-0 flex-1 truncate text-left">{{
                  wishlist.name
                }}</span>
                <span
                  v-if="wishlist.itemCount !== undefined"
                  class="text-muted-foreground ml-auto flex-shrink-0 text-xs"
                >
                  {{ wishlist.itemCount }}
                </span>
              </a>
            </Button>
          </router-link>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="px-2 py-4 text-center">
          <FileText class="text-muted-foreground/50 mx-auto mb-2 h-6 w-6" />
          <p class="text-muted-foreground text-xs">Keine Wishlists vorhanden</p>
        </div>
      </nav>
      <div class="min-w-0">
        <router-view />
      </div>
    </div>
  </div>
</template>
