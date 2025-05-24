<template>
  <div>
    <SearchBar
      @search="handleSearch"
      @clear="handleClear"
      :isLoading="loading"
    />

    <div class="mt-8">
      <div
        v-if="searchResults.length === 0 && !loading && !hasSearched"
        class="text-muted-foreground py-12 text-center"
      >
        <p>Geben Sie einen Suchbegriff ein, um iTunes-Inhalte zu finden.</p>
      </div>

      <div
        v-else-if="searchResults.length === 0 && !loading && hasSearched"
        class="text-muted-foreground py-12 text-center"
      >
        <p>Keine Ergebnisse gefunden. Versuchen Sie eine andere Suche!</p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        <Card
          v-for="result in searchResults"
          :key="result.trackId || result.collectionId"
          class="group border-border bg-card hover:shadow-primary/5 overflow-hidden border pt-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="bg-muted relative aspect-[2/3] overflow-hidden">
            <img
              :src="getArtworkUrl(result)"
              :alt="result.trackName || result.collectionName || 'Artwork'"
              class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              @error="handleImageError"
              loading="lazy"
            />

            <!-- Media type badge -->
            <div class="absolute top-2 right-2">
              <span
                class="inline-flex items-center rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
              >
                {{ getMediaType(result) }}
              </span>
            </div>

            <!-- Price overlay -->
            <div
              v-if="result.trackPrice || result.collectionPrice"
              class="absolute bottom-2 left-2"
            >
              <span
                class="bg-primary text-primary-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
              >
                {{
                  formatPrice(
                    result.trackHdPrice || result.collectionHdPrice,
                    result.currency,
                  )
                }}
              </span>
            </div>
          </div>

          <CardContent class="space-y-2 p-3">
            <div class="space-y-1">
              <CardTitle
                class="line-clamp-2 text-sm leading-tight font-semibold"
              >
                {{ result.trackName || result.collectionName }}
              </CardTitle>

              <CardDescription
                class="text-muted-foreground line-clamp-1 text-xs"
              >
                {{ result.artistName }}
              </CardDescription>
            </div>

            <div class="text-muted-foreground flex flex-wrap gap-1 text-xs">
              <span
                v-if="result.primaryGenreName"
                class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
              >
                {{ result.primaryGenreName }}
              </span>

              <span
                v-if="result.releaseDate"
                class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
              >
                {{ formatDate(result.releaseDate) }}
              </span>
            </div>
          </CardContent>

          <CardAction
            v-if="result.trackViewUrl || result.collectionViewUrl"
            class="mt-auto space-y-2 p-3 pt-0"
          >
            <Button variant="outline" as-child class="w-full">
              <a
                :href="result.trackViewUrl || result.collectionViewUrl"
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
              @click="handleAddItem(result)"
              :disabled="addingItems.has(result.trackId || result.collectionId)"
              class="w-full"
            >
              {{
                addingItems.has(result.trackId || result.collectionId)
                  ? 'Wird hinzugefügt...'
                  : 'Zur Sammlung hinzufügen'
              }}
            </Button>
          </CardAction>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ofetch } from 'ofetch'
import SearchBar from '@/components/itunes/SearchBar.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import type {
  SearchResult,
  SearchParams,
  SearchResponse,
} from '@/lib/itunes/search'

const searchResults = ref<SearchResult[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const addingItems = ref<Set<number>>(new Set())

async function handleSearch(payload: SearchParams) {
  const url = new URL('/api/itunes/search', window.location.origin)
  url.searchParams.set('term', payload.term)
  if (payload.media) url.searchParams.set('media', payload.media.toString())

  try {
    loading.value = true
    hasSearched.value = true
    const results = await ofetch<SearchResponse>(url.toString())
    searchResults.value = results.results
  } catch (error) {
    console.error('Error fetching search results:', error)
    return
  } finally {
    loading.value = false
  }
}

function handleClear() {
  searchResults.value = []
  hasSearched.value = false
}

async function handleAddItem(result: SearchResult) {
  const itunesId = result.trackId || result.collectionId
  if (!itunesId || addingItems.value.has(itunesId)) {
    return
  }

  try {
    addingItems.value.add(itunesId)

    const response = await ofetch('/api/itunes/add', {
      method: 'POST',
      body: {
        itunesId,
        isCollection: !!result.collectionId && !result.trackId,
      },
    })

    if (response.success) {
      // Show success feedback - you might want to add a toast notification here
      console.log('Item added successfully:', response.mediaItemId)
    }
  } catch (error) {
    console.error('Error adding item:', error)
    // Show error feedback - you might want to add a toast notification here
  } finally {
    addingItems.value.delete(itunesId)
  }
}

function getArtworkUrl(result: SearchResult): string {
  const baseUrl =
    result.artworkUrl600 ||
    result.artworkUrl100 ||
    result.artworkUrl60 ||
    result.artworkUrl30

  if (!baseUrl) {
    return '/placeholder-image.svg'
  }

  // Replace common iTunes artwork URL patterns with higher quality webp format
  return baseUrl
    .replace('/100x100bb.jpg', '/536x0w.webp')
    .replace('/60x60bb.jpg', '/536x0w.webp')
    .replace('/30x30bb.jpg', '/536x0w.webp')
    .replace('/600x600bb.jpg', '/536x0w.webp')
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = '/placeholder-image.svg'
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function formatPrice(price: number | undefined, currency: string): string {
  if (!price) return 'Kostenlos'

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price)
  } catch {
    return `${price} ${currency || 'EUR'}`
  }
}

function getMediaType(result: SearchResult): string {
  if (result.kind) {
    switch (result.kind) {
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
        return 'Film'
      case 'software':
        return 'App'
      case 'ebook':
        return 'Buch'
      default:
        return result.kind
    }
  }

  // Fallback based on wrapper type or media type
  if (result.wrapperType === 'track') return 'Titel'
  if (result.wrapperType === 'collection') return 'Sammlung'
  if (result.wrapperType === 'artist') return 'Künstler'

  return 'Medien'
}
</script>
