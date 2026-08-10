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
      class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      <WatchlistItemCard
        v-for="item in watchlistItems"
        :key="item.id"
        :item="item"
        :is-removing="removingItems.has(item.id)"
        @remove="handleRemoveItem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ofetch } from 'ofetch'
import { toast } from 'vue-sonner'
import WatchlistItemCard from '@/components/itunes/WatchlistItemCard.vue'
import { parseWatchlistItem } from '@/lib/itunes/watchlist'
import type {
  WatchlistResponse,
  RemoveItemResponse,
  ParsedWatchlistItem,
} from '@/lib/itunes/watchlist'

const watchlistItems = ref<ParsedWatchlistItem[]>([])
const loading = ref(false)
const removingItems = ref<Set<string>>(new Set())

async function fetchWatchlist() {
  try {
    loading.value = true
    const response = await ofetch<WatchlistResponse>('/api/itunes/list')

    if (response.success) {
      watchlistItems.value = response.data.map(parseWatchlistItem)
    }
  } catch (error) {
    console.error('Error fetching watchlist:', error)
  } finally {
    loading.value = false
  }
}

async function handleRemoveItem(item: ParsedWatchlistItem) {
  if (removingItems.value.has(item.id)) return

  try {
    removingItems.value.add(item.id)

    const response = await ofetch<RemoveItemResponse>('/api/itunes/remove', {
      method: 'DELETE',
      body: { id: item.id },
    })

    if (!response.success) {
      console.error('Failed to remove item:', response.message)
      toast('Fehler', {
        description: 'Element konnte nicht entfernt werden',
        variant: 'destructive',
      })
      return
    }

    watchlistItems.value = watchlistItems.value.filter(
      (watchlistItem) => watchlistItem.id !== item.id,
    )
    toast('Element entfernt', {
      description: `${item.name || 'Eintrag'} wurde aus der Watchlist entfernt`,
    })
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
