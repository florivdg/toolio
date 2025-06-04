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
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <MediaCard
          v-for="result in searchResults"
          :key="result.trackId || result.collectionId"
          :title="result.trackName || result.collectionName || ''"
          :artist-name="result.artistName"
          :artwork-url="getArtworkUrl(result)"
          :media-type="getMediaType(result)"
          :price="getResultPrice(result)"
          :genre="result.primaryGenreName"
          :release-date="result.releaseDate"
        >
          <template #actions>
            <Button
              v-if="result.trackViewUrl || result.collectionViewUrl"
              variant="outline"
              as-child
              class="w-full"
            >
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
              :disabled="addingItems.has(getItunesId(result))"
              class="w-full"
            >
              {{
                addingItems.has(getItunesId(result))
                  ? 'Wird hinzugefügt...'
                  : 'Zur Sammlung hinzufügen'
              }}
            </Button>
          </template>
        </MediaCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ofetch } from 'ofetch'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/itunes/SearchBar.vue'
import MediaCard from '@/components/itunes/MediaCard.vue'
import { Button } from '@/components/ui/button'
import type {
  SearchResult,
  SearchParams,
  SearchResponse,
} from '@/lib/itunes/search'
import {
  formatDate,
  formatPrice,
  getMediaType,
  getArtworkUrl,
  handleImageError,
} from '@/lib/itunes/helpers'

const router = useRouter()
const searchResults = ref<SearchResult[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const addingItems = ref<Set<number>>(new Set())

function getItunesId(result: SearchResult): number {
  // Prefer trackId, then collectionId, else throw
  if (typeof result.trackId === 'number') return result.trackId
  if (typeof result.collectionId === 'number') return result.collectionId
  throw new Error('Kein gültiger iTunes-Identifier gefunden.')
}

function getResultPrice(result: SearchResult): string | null {
  if (result.trackPrice || result.collectionPrice) {
    const price =
      result.trackHdPrice ||
      result.collectionHdPrice ||
      result.trackPrice ||
      result.collectionPrice
    if (price && result.currency) {
      return formatPrice(price, result.currency)
    }
  }
  return null
}

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
  let itunesId: number
  try {
    itunesId = getItunesId(result)
  } catch (e) {
    // Optionally show error feedback here
    return
  }
  if (addingItems.value.has(itunesId)) {
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
      // Show success toast notification
      toast('Element hinzugefügt', {
        description: `${result.trackName || result.collectionName} wurde zur Watchlist hinzugefügt`,
        action: {
          label: 'Zur Watchlist',
          onClick: () => router.push('/tools/itunes/watchlist'),
        },
      })
    }
  } catch (error) {
    console.error('Error adding item:', error)
    // Show error toast notification
    toast('Fehler', {
      description: 'Element konnte nicht hinzugefügt werden',
      variant: 'destructive',
    })
  } finally {
    addingItems.value.delete(itunesId)
  }
}
</script>
