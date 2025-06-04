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
      <MediaCard
        v-for="item in watchlistItems"
        :key="item.id"
        :title="item.name || ''"
        :artist-name="item.artistName"
        :artwork-url="getArtworkUrl(item)"
        :media-type="getMediaTypeLabel(item)"
        :price="getLatestPrice(item)"
        :genre="item.primaryGenreName"
        :release-date="item.releaseDate"
      >
        <template #actions>
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                class="w-full"
                :disabled="removingItems.has(item.id)"
              >
                <Trash2 class="mr-1 h-3 w-3" />
                {{
                  removingItems.has(item.id)
                    ? 'Wird entfernt...'
                    : 'Aus Watchlist entfernen'
                }}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Element entfernen</AlertDialogTitle>
                <AlertDialogDescription>
                  Sind Sie sicher, dass Sie "{{
                    item.name || 'diesen Eintrag'
                  }}" aus Ihrer Watchlist entfernen möchten?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction @click="handleRemoveItem(item)">
                  Ja, entfernen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </template>
      </MediaCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ofetch } from 'ofetch'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MediaCard from '@/components/itunes/MediaCard.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type {
  WatchlistResponse,
  RemoveItemResponse,
  ParsedWatchlistItem,
} from '@/lib/itunes/watchlist'
import { formatDate, formatPrice } from '@/lib/itunes/helpers'

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
