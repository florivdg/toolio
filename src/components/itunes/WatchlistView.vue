<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-foreground text-2xl font-bold">Meine Watchlist</h2>
      <div class="text-muted-foreground text-sm">
        {{ watchlistItems.length }}
        {{ watchlistItems.length === 1 ? 'Element' : 'Elemente' }}
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center">
      <div class="text-muted-foreground">Lade Watchlist...</div>
    </div>

    <div
      v-else-if="watchlistItems.length === 0"
      class="text-muted-foreground py-12 text-center"
    >
      <p>Ihre Watchlist ist leer.</p>
      <p class="mt-2">
        Suchen Sie nach Inhalten und fügen Sie sie zu Ihrer Sammlung hinzu.
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <Card
        v-for="item in watchlistItems"
        :key="item.id"
        class="group border-border bg-card hover:shadow-primary/5 overflow-hidden border pt-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      >
        <div class="bg-muted relative aspect-[2/3] overflow-hidden">
          <img
            :src="getArtworkUrl(item)"
            :alt="item.name || 'Artwork'"
            class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            @error="handleImageError"
            loading="lazy"
          />

          <!-- Media type badge -->
          <div class="absolute top-2 right-2">
            <span
              class="inline-flex items-center rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              {{ getMediaTypeLabel(item) }}
            </span>
          </div>

          <!-- Price overlay (if available from additional data) -->
          <div v-if="getLatestPrice(item)" class="absolute bottom-2 left-2">
            <span
              class="bg-primary text-primary-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
            >
              {{ getLatestPrice(item) }}
            </span>
          </div>
        </div>

        <CardContent class="space-y-2 p-3">
          <div class="space-y-1">
            <CardTitle class="line-clamp-2 text-sm leading-tight font-semibold">
              {{ item.name }}
            </CardTitle>

            <CardDescription
              v-if="item.artistName"
              class="text-muted-foreground line-clamp-1 text-xs"
            >
              {{ item.artistName }}
            </CardDescription>
          </div>

          <div class="text-muted-foreground flex flex-wrap gap-1 text-xs">
            <span
              v-if="item.primaryGenreName"
              class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
            >
              {{ item.primaryGenreName }}
            </span>

            <span
              v-if="item.releaseDate"
              class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
            >
              {{ formatDate(item.releaseDate.toString()) }}
            </span>
          </div>
        </CardContent>

        <CardAction class="mt-auto space-y-2 p-3 pt-0">
          <Button v-if="item.viewUrl" variant="outline" as-child class="w-full">
            <a
              :href="item.viewUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex w-full items-center justify-center"
            >
              <svg
                class="mr-1 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              In iTunes ansehen
            </a>
          </Button>

          <Button
            @click="handleRemoveItem(item)"
            :disabled="removingItems.has(item.id)"
            variant="destructive"
            class="w-full"
          >
            <Trash2 class="mr-1 h-3 w-3" />
            {{
              removingItems.has(item.id)
                ? 'Wird entfernt...'
                : 'Aus Watchlist entfernen'
            }}
          </Button>
        </CardAction>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ofetch } from 'ofetch'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import type {
  WatchlistResponse,
  RemoveItemResponse,
  ParsedWatchlistItem,
} from '@/lib/itunes/watchlist'
import { formatDate, formatPrice, handleImageError } from '@/lib/itunes/helpers'

const watchlistItems = ref<ParsedWatchlistItem[]>([])
const loading = ref(false)
const removingItems = ref<Set<string>>(new Set())

// Helper functions
function getArtworkUrl(item: ParsedWatchlistItem): string {
  let baseUrl = item.artworkUrl

  // Try to get artwork from additional data if not directly available
  if (!baseUrl && item.additionalData) {
    try {
      const additionalData =
        typeof item.additionalData === 'string'
          ? JSON.parse(item.additionalData)
          : item.additionalData

      baseUrl =
        additionalData.artworkUrl600 ||
        additionalData.artworkUrl512 ||
        additionalData.artworkUrl300 ||
        additionalData.artworkUrl100 ||
        additionalData.artworkUrl60 ||
        additionalData.artworkUrl30
    } catch {
      // Ignore parse errors
    }
  }

  if (!baseUrl) {
    return '/placeholder-image.svg'
  }

  // Apply the same optimization as the helper function for higher quality images
  return baseUrl
    .replace('/100x100bb.jpg', '/536x0w.webp')
    .replace('/60x60bb.jpg', '/536x0w.webp')
    .replace('/30x30bb.jpg', '/536x0w.webp')
    .replace('/600x600bb.jpg', '/536x0w.webp')
}

function getMediaTypeLabel(item: ParsedWatchlistItem): string {
  if (item.entityType) {
    switch (item.entityType) {
      case 'song':
        return 'Titel'
      case 'album':
        return 'Album'
      case 'artist':
        return 'Künstler'
      case 'podcast':
        return 'Podcast'
      case 'audiobook':
        return 'Hörbuch'
      case 'music-video':
        return 'Musikvideo'
      case 'tv-episode':
        return 'TV-Folge'
      case 'tv-season':
        return 'TV-Staffel'
      case 'feature-movie':
      case 'movie':
        return 'Film'
      case 'software':
        return 'App'
      case 'ebook':
        return 'Buch'
      default:
        return item.entityType
    }
  }

  // Fallback based on wrapper type or media type
  if (item.wrapperType === 'track') return 'Titel'
  if (item.wrapperType === 'collection') return 'Sammlung'
  if (item.wrapperType === 'artist') return 'Künstler'
  if (item.mediaType) return item.mediaType

  return 'Medien'
}

function getLatestPrice(item: ParsedWatchlistItem): string | null {
  try {
    const additionalData = item.additionalData

    if (additionalData) {
      const price =
        additionalData.trackHdPrice ||
        additionalData.collectionHdPrice ||
        additionalData.trackPrice ||
        additionalData.collectionPrice

      if (price && item.currency) {
        return formatPrice(price, item.currency)
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null
}

async function fetchWatchlist() {
  try {
    loading.value = true
    const response = await ofetch<WatchlistResponse>('/api/itunes/list')

    if (response.success) {
      // Parse additionalData for each item
      watchlistItems.value = response.data.map((item) => ({
        ...item,
        additionalData: item.additionalData
          ? typeof item.additionalData === 'string'
            ? JSON.parse(item.additionalData)
            : item.additionalData
          : undefined,
      }))
    }
  } catch (error) {
    console.error('Error fetching watchlist:', error)
  } finally {
    loading.value = false
  }
}

async function handleRemoveItem(item: ParsedWatchlistItem) {
  if (removingItems.value.has(item.id)) {
    return
  }

  try {
    removingItems.value.add(item.id)

    const response = await ofetch<RemoveItemResponse>('/api/itunes/remove', {
      method: 'DELETE',
      body: {
        id: item.id,
      },
    })

    if (response.success) {
      // Remove item from local list
      watchlistItems.value = watchlistItems.value.filter(
        (watchlistItem) => watchlistItem.id !== item.id,
      )
      console.log('Item removed successfully:', response.removedItemId)
    } else {
      console.error('Failed to remove item:', response.message)
    }
  } catch (error) {
    console.error('Error removing item:', error)
  } finally {
    removingItems.value.delete(item.id)
  }
}

// Load watchlist on component mount
onMounted(() => {
  fetchWatchlist()
})
</script>
