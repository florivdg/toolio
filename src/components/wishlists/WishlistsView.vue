<template>
  <div>
    <div class="mb-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div>
        <h2 class="text-2xl font-bold">Meine Wishlists</h2>
        <p class="text-muted-foreground mt-2">
          Hier werden alle Ihre Wishlists angezeigt.
        </p>
      </div>
      <div class="flex justify-start md:justify-end">
        <CreateWishlistModal @created="handleWishlistCreated" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="animate-pulse">
        <Card>
          <CardHeader>
            <div class="bg-muted h-4 w-3/4 rounded"></div>
            <div class="bg-muted h-3 w-1/2 rounded"></div>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="bg-muted h-3 rounded"></div>
              <div class="bg-muted h-3 w-4/5 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12 text-center">
      <div class="text-destructive space-y-4">
        <AlertCircle class="text-destructive mx-auto h-12 w-12" />
        <div class="space-y-2">
          <p class="font-semibold">Fehler beim Laden der Wishlists</p>
          <p class="text-muted-foreground text-sm">{{ error }}</p>
        </div>
        <Button @click="resetAndRefetch" variant="outline" class="mt-4">
          Erneut versuchen
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="allWishlists.length === 0" class="py-12 text-center">
      <div class="space-y-4">
        <FileText class="text-muted-foreground/50 mx-auto h-16 w-16" />
        <div class="space-y-2">
          <h3 class="text-lg font-semibold">Noch keine Wishlists</h3>
          <p class="text-muted-foreground">
            Erstellen Sie Ihre erste Wishlist, um Ihre Wünsche zu organisieren.
          </p>
        </div>
        <CreateWishlistModal @created="handleWishlistCreated">
          <template #trigger>
            <Button class="mt-4"> Erste Wishlist erstellen </Button>
          </template>
        </CreateWishlistModal>
      </div>
    </div>

    <!-- Wishlists Grid -->
    <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <WishlistCard
        v-for="wishlist in allWishlists"
        :key="wishlist.id"
        :wishlist="wishlist"
        @open="navigateToWishlist"
      />
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="mt-8 text-center">
      <Button @click="loadMore" :disabled="loadingMore" variant="outline">
        <span v-if="loadingMore">Lädt mehr...</span>
        <span v-else>Mehr laden</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CreateWishlistModal from './CreateWishlistModal.vue'
import WishlistCard from './WishlistCard.vue'
import { AlertCircle, FileText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useWishlistsQuery } from '@/lib/wishlists/queries'
import {
  normalizeWishlist,
  normalizeWishlists,
} from '@/lib/wishlists/normalize'
import type { WishlistWithItems } from '@/lib/wishlists/normalize'

// Vue Router
const router = useRouter()

// Pagination state
const limit = 12
const currentOffset = ref(0)
const loadingMore = ref(false)

// Accumulated results for load more functionality
const allWishlists = ref<WishlistWithItems[]>([])

// Primary query for the first page
const {
  data: initialData,
  isLoading: initialLoading,
  error: initialError,
  refetch: refetchInitial,
} = useWishlistsQuery(limit, 0)

// Computed values
const loading = computed(() => initialLoading.value)
const error = computed(() => initialError.value?.message || null)
const hasMore = computed(
  () =>
    !!initialData.value &&
    allWishlists.value.length < initialData.value.pagination.total,
)

/** Replaces the accumulated list with a freshly fetched first page. */
function adoptFirstPage(data: typeof initialData.value) {
  if (!data?.data) return

  allWishlists.value = normalizeWishlists(data.data)
  currentOffset.value = 0
}

// Initialize with first page data
onMounted(() => adoptFirstPage(initialData.value))

// Watch for initial data changes
watch(initialData, adoptFirstPage, { deep: true })

// Handle wishlist created event from modal
const handleWishlistCreated = (wishlist: WishlistWithItems) => {
  const normalized = normalizeWishlist(wishlist)
  if (!normalized) return

  // Add new wishlist to the beginning of the list
  allWishlists.value.unshift(normalized)
}

// Load more wishlists - use direct fetch for additional pages
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  const newOffset = allWishlists.value.length

  try {
    const response = await fetch(
      `/api/wishlists?limit=${limit}&offset=${newOffset}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error('API returned success: false')
    }

    // Normalised like the first page, so later pages cannot render differently.
    allWishlists.value.push(...normalizeWishlists(data.data))
    currentOffset.value = newOffset
  } catch (err) {
    console.error('Error loading more wishlists:', err)
    toast.error('Fehler beim Laden weiterer Wishlists')
  } finally {
    loadingMore.value = false
  }
}

// Navigate to individual wishlist
const navigateToWishlist = (wishlistId: string) => {
  router.push(`/tools/wishlists/${wishlistId}`)
}

// Reset function for error recovery
const resetAndRefetch = async () => {
  currentOffset.value = 0
  allWishlists.value = []
  await refetchInitial()
}
</script>
