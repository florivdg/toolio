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
    <div v-else>
      <!-- Grid -->
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="wishlist in allWishlists"
          :key="wishlist.id"
          class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
          @click="navigateToWishlist(wishlist.id)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <CardTitle class="text-lg">{{ wishlist.name }}</CardTitle>
                <CardDescription v-if="wishlist.description" class="mt-1">
                  {{ wishlist.description }}
                </CardDescription>
              </div>
              <Badge variant="secondary" class="ml-2 flex-shrink-0">
                {{ wishlist.itemCount || 0 }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <!-- Latest Items Preview -->
            <div
              v-if="wishlist.latestItems && wishlist.latestItems.length > 0"
              class="space-y-3"
            >
              <div class="text-muted-foreground text-sm font-medium">
                Neueste Artikel:
              </div>
              <div class="space-y-2">
                <div
                  v-for="item in wishlist.latestItems"
                  :key="item.id"
                  class="bg-muted/30 flex items-center space-x-3 rounded-md p-2"
                >
                  <div
                    v-if="item.imageUrl"
                    class="h-8 w-8 flex-shrink-0 overflow-hidden rounded"
                  >
                    <img
                      :src="item.imageUrl"
                      :alt="item.name"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div
                    v-else
                    class="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded"
                  >
                    <Package class="text-muted-foreground h-4 w-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ item.name }}</p>
                    <p v-if="item.price" class="text-muted-foreground text-xs">
                      {{ item.price.toFixed(2) }}€
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="py-8 text-center">
              <FileText class="text-muted-foreground/50 mx-auto mb-3 h-8 w-8" />
              <p class="text-muted-foreground text-sm">
                Noch keine Artikel hinzugefügt
              </p>
            </div>
          </CardContent>
          <CardFooter class="pt-3">
            <Button
              variant="outline"
              size="sm"
              class="w-full"
              @click.stop="navigateToWishlist(wishlist.id)"
            >
              Wishlist anzeigen
            </Button>
          </CardFooter>
        </Card>
      </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CreateWishlistModal from './CreateWishlistModal.vue'
import { AlertCircle, FileText, Package } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useWishlistsQuery, type WishlistWithItems } from '@/lib/wishlists/queries'

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
  refetch: refetchInitial 
} = useWishlistsQuery(limit, 0)

// Computed values
const loading = computed(() => initialLoading.value)
const error = computed(() => initialError.value?.message || null)
const hasMore = computed(() => {
  if (!initialData.value) return false
  const currentTotal = allWishlists.value.length
  return currentTotal < initialData.value.pagination.total
})

// Initialize with first page data
onMounted(() => {
  if (initialData.value?.data) {
    allWishlists.value = [...initialData.value.data]
  }
})

// Watch for initial data changes
import { watch } from 'vue'
watch(initialData, (newData) => {
  if (newData?.data) {
    allWishlists.value = [...newData.data]
    currentOffset.value = 0
  }
}, { deep: true })

// Handle wishlist created event from modal
const handleWishlistCreated = (wishlist: WishlistWithItems) => {
  // Add new wishlist to the beginning of the list
  allWishlists.value.unshift(wishlist)
}

// Load more wishlists - use direct fetch for additional pages
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  const newOffset = allWishlists.value.length
  
  try {
    const response = await fetch(`/api/wishlists?limit=${limit}&offset=${newOffset}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error('API returned success: false')
    }

    // Append new items
    allWishlists.value.push(...data.data)
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
