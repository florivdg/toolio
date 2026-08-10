<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import { handleImageError } from '@/lib/wishlists/helpers'

withDefaults(
  defineProps<{
    src?: string | null
    alt: string
    /** Table rows use the small box, cards the larger one. */
    size?: 'sm' | 'lg'
  }>(),
  { src: null, size: 'sm' },
)
</script>

<template>
  <div
    class="bg-muted flex items-center justify-center overflow-hidden rounded border"
    :class="size === 'lg' ? 'h-16 w-16 flex-shrink-0' : 'h-12 w-12'"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      @error="handleImageError"
    />
    <Package v-else class="text-muted-foreground h-6 w-6" />
  </div>
</template>
