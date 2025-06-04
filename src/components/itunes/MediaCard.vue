<template>
  <Card
    class="group border-border bg-card hover:shadow-primary/5 overflow-hidden border pt-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
  >
    <div class="bg-muted relative aspect-[2/3] overflow-hidden">
      <img
        :src="artworkUrl"
        :alt="title || 'Artwork'"
        class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        @error="handleImageError"
        loading="lazy"
      />

      <!-- Media type badge -->
      <div class="absolute top-2 right-2">
        <span
          class="inline-flex items-center rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
        >
          {{ mediaType }}
        </span>
      </div>

      <!-- Price overlay -->
      <div v-if="price" class="absolute bottom-2 left-2">
        <span
          class="bg-primary text-primary-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
        >
          {{ price }}
        </span>
      </div>
    </div>

    <CardContent class="space-y-2 p-3">
      <div class="space-y-1">
        <CardTitle class="line-clamp-2 text-sm leading-tight font-semibold">
          {{ title }}
        </CardTitle>

        <CardDescription
          v-if="artistName"
          class="text-muted-foreground line-clamp-1 text-xs"
        >
          {{ artistName }}
        </CardDescription>
      </div>

      <div class="text-muted-foreground flex flex-wrap gap-1 text-xs">
        <span
          v-if="genre"
          class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
        >
          {{ genre }}
        </span>

        <span
          v-if="releaseDate"
          class="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-0.5"
        >
          {{ formattedReleaseDate }}
        </span>
      </div>
    </CardContent>

    <CardAction v-if="$slots.actions" class="mt-auto space-y-2 p-3 pt-0">
      <slot name="actions" />
    </CardAction>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { formatDate, handleImageError } from '@/lib/itunes/helpers'

interface Props {
  title: string
  artistName?: string
  artworkUrl: string
  mediaType: string
  price?: string | null
  genre?: string
  releaseDate?: string | Date
}

const props = defineProps<Props>()

const formattedReleaseDate = computed(() => {
  if (!props.releaseDate) return null

  // Handle both string and Date types
  const dateString =
    props.releaseDate instanceof Date
      ? props.releaseDate.toISOString()
      : props.releaseDate.toString()

  return formatDate(dateString)
})
</script>
