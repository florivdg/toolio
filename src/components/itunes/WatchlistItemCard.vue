<template>
  <MediaCard
    :title="item.name || ''"
    :artist-name="item.artistName"
    :artwork-url="getWatchlistArtworkUrl(item)"
    :media-type="getMediaTypeLabel(item)"
    :price="getLatestPrice(item)"
    :genre="item.primaryGenreName"
    :release-date="item.releaseDate"
  >
    <template #actions>
      <ItunesLinkButton :href="item.viewUrl" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" class="w-full" :disabled="isRemoving">
            <Trash2 class="mr-1 h-3 w-3" />
            {{ isRemoving ? 'Wird entfernt...' : 'Aus Watchlist entfernen' }}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Element entfernen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie "{{ item.name || 'diesen Eintrag' }}"
              aus Ihrer Watchlist entfernen möchten?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction @click="emit('remove', item)">
              Ja, entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>
  </MediaCard>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import MediaCard from '@/components/itunes/MediaCard.vue'
import ItunesLinkButton from '@/components/itunes/ItunesLinkButton.vue'
import { Button } from '@/components/ui/button'
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
import {
  getLatestPrice,
  getMediaTypeLabel,
  getWatchlistArtworkUrl,
} from '@/lib/itunes/watchlist'
import type { ParsedWatchlistItem } from '@/lib/itunes/watchlist'

/** One watchlist entry, with its confirm-before-removing action. */
defineProps<{ item: ParsedWatchlistItem; isRemoving: boolean }>()

const emit = defineEmits<{ remove: [item: ParsedWatchlistItem] }>()
</script>
