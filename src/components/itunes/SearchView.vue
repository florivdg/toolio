<template>
  <div>
    <SearchBar
      @search="handleSearch"
      @clear="handleClear"
      :isLoading="loading"
    />

    <div class="mt-8">
      <div v-if="emptyMessage" class="text-muted-foreground py-12 text-center">
        <p>{{ emptyMessage }}</p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <SearchResultCard
          v-for="result in searchResults"
          :key="result.trackId || result.collectionId"
          :result="result"
          :is-adding="isAdding(result)"
          @add="handleAddItem"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ofetch } from 'ofetch'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/itunes/SearchBar.vue'
import SearchResultCard from '@/components/itunes/SearchResultCard.vue'
import type {
  SearchResult,
  SearchParams,
  SearchResponse,
} from '@/lib/itunes/search'
import { getItunesId } from '@/lib/itunes/helpers'

const router = useRouter()
const searchResults = ref<SearchResult[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const addingItems = ref<Set<number>>(new Set())

/** Which of the two empty states to show, or null when there are results. */
const emptyMessage = computed(() => {
  if (loading.value || searchResults.value.length > 0) return null

  return hasSearched.value
    ? 'Keine Ergebnisse gefunden. Versuchen Sie eine andere Suche!'
    : 'Geben Sie einen Suchbegriff ein, um iTunes-Inhalte zu finden.'
})

/** A result with no usable id can never be in flight. */
function isAdding(result: SearchResult): boolean {
  try {
    return addingItems.value.has(getItunesId(result))
  } catch {
    return false
  }
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
  } catch {
    // Nothing to add without an id; the card simply stays as it is.
    return
  }

  if (addingItems.value.has(itunesId)) return

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
    toast('Fehler', {
      description: 'Element konnte nicht hinzugefügt werden',
      variant: 'destructive',
    })
  } finally {
    addingItems.value.delete(itunesId)
  }
}
</script>
