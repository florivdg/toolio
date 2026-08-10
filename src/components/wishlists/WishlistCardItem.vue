<template>
  <div class="bg-muted/30 flex items-center space-x-3 rounded-md p-2">
    <div
      v-if="item.imageUrl"
      class="h-8 w-8 flex-shrink-0 overflow-hidden rounded"
    >
      <img
        :src="item.imageUrl"
        :alt="item.name"
        class="h-full w-full object-cover"
      />
    </div>
    <div
      v-else
      class="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded"
    >
      <Package class="text-muted-foreground h-4 w-4" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">{{ item.name }}</p>
      <p v-if="item.price" class="text-muted-foreground text-xs">
        {{ item.price.toFixed(2) }}€
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { WishlistItem } from '@/db/schema/wishlists'

/** One line of a wishlist card's "Neueste Artikel" preview. */
defineProps<{ item: Partial<WishlistItem> }>()
</script>
