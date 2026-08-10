<template>
  <MediaCard
    :title="result.trackName || result.collectionName || ''"
    :artist-name="result.artistName"
    :artwork-url="getArtworkUrl(result)"
    :media-type="getMediaType(result)"
    :price="getResultPrice(result)"
    :genre="result.primaryGenreName"
    :release-date="result.releaseDate"
  >
    <template #actions>
      <ItunesLinkButton
        :href="result.trackViewUrl || result.collectionViewUrl"
      />

      <Button :disabled="isAdding" class="w-full" @click="emit('add', result)">
        {{ isAdding ? 'Wird hinzugefügt...' : 'Zur Sammlung hinzufügen' }}
      </Button>
    </template>
  </MediaCard>
</template>

<script setup lang="ts">
import MediaCard from '@/components/itunes/MediaCard.vue'
import ItunesLinkButton from '@/components/itunes/ItunesLinkButton.vue'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@/lib/itunes/search'
import {
  getArtworkUrl,
  getMediaType,
  getResultPrice,
} from '@/lib/itunes/helpers'

/** One search result, with the actions that turn it into a watchlist entry. */
defineProps<{ result: SearchResult; isAdding: boolean }>()

const emit = defineEmits<{ add: [result: SearchResult] }>()
</script>
