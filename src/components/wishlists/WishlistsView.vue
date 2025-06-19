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
        <Button @click="fetchWishlists" variant="outline" class="mt-4">
          Erneut versuchen
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="wishlists.length === 0" class="py-12 text-center">
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
          v-for="wishlist in wishlists"
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
import { ref, onMounted, inject } from 'vue'
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

// Vue Router
const router = useRouter()

// Inject sidebar refresh function
const refreshSidebar = inject<() => void>('refreshSidebar')

// Types
interface WishlistItem {
  id: string
  name: string
  imageUrl?: string
  url: string
  price?: number
}

interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: Date | string
  updatedAt?: Date | string
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

// Reactive state
const wishlists = ref<Wishlist[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const hasMore = ref(false)
const currentOffset = ref(0)
const limit = 12

// Fetch wishlists from API
const fetchWishlists = async (offset = 0, replace = true) => {
  try {
    if (offset === 0) {
      loading.value = true
    } else {
      loadingMore.value = true
    }

    error.value = null

    const response = await fetch(
      `/api/wishlists?limit=${limit}&offset=${offset}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: WishlistsResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned success: false')
    }

    if (replace) {
      wishlists.value = data.data
    } else {
      wishlists.value.push(...data.data)
    }

    hasMore.value = data.pagination.hasMore
    currentOffset.value = offset + data.data.length
  } catch (err) {
    console.error('Error fetching wishlists:', err)
    error.value = err instanceof Error ? err.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// Handle wishlist created event from modal
const handleWishlistCreated = (wishlist: Wishlist) => {
  // Add new wishlist to the beginning of the list
  wishlists.value.unshift(wishlist)

  // Refresh sidebar to show new wishlist
  refreshSidebar?.()
}

// Load more wishlists
const loadMore = () => {
  if (!loadingMore.value && hasMore.value) {
    fetchWishlists(currentOffset.value, false)
  }
}

// Navigate to individual wishlist
const navigateToWishlist = (wishlistId: string) => {
  router.push(`/tools/wishlists/${wishlistId}`)
}

// Initialize component
onMounted(() => {
  fetchWishlists()
})
</script>
