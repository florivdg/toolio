<script setup lang="ts">
import type { WishlistItem } from '@/db/schema/wishlists'
import WishlistItemActions from './WishlistItemActions.vue'
import WishlistItemPrice from './WishlistItemPrice.vue'
import WishlistItemPriority from './WishlistItemPriority.vue'
import WishlistItemStatusBadge from './WishlistItemStatusBadge.vue'
import WishlistItemThumbnail from './WishlistItemThumbnail.vue'

/** Narrow-viewport card. The wide counterpart is WishlistItemRow.vue. */
defineProps<{ item: WishlistItem }>()

defineEmits<{
  openUrl: [url: string]
  edit: [item: WishlistItem]
  move: [item: WishlistItem]
  togglePurchased: [itemId: string, purchased: boolean]
  toggleActive: [itemId: string, active: boolean]
  remove: [item: WishlistItem]
}>()

/** Each cell stacks on the narrowest widths and becomes a column at @sm. */
const CELL =
  'flex items-center justify-between @sm:flex-col @sm:items-start @sm:justify-start'
</script>

<template>
  <div class="space-y-4 p-4 @3xl:hidden">
    <!-- Header with Image and Name -->
    <div class="flex items-start gap-3">
      <WishlistItemThumbnail :src="item.imageUrl" :alt="item.name" size="lg" />
      <div class="min-w-0 flex-1">
        <h3 class="leading-tight font-medium" :title="item.name">
          {{ item.name }}
        </h3>
        <div
          v-if="item.description"
          class="text-muted-foreground mt-1 line-clamp-2 text-sm"
        >
          {{ item.description }}
        </div>
        <div v-if="item.notes" class="text-muted-foreground mt-1 text-xs italic">
          Notiz: {{ item.notes }}
        </div>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="grid grid-cols-1 gap-3 @sm:grid-cols-2">
      <!-- Price -->
      <div :class="CELL">
        <span class="text-muted-foreground text-sm font-medium">Preis</span>
        <WishlistItemPrice :price="item.price" />
      </div>

      <!-- Priority -->
      <div :class="CELL">
        <span class="text-muted-foreground text-sm font-medium">Priorität</span>
        <WishlistItemPriority :priority="item.priority" />
      </div>

      <!-- Status -->
      <div :class="CELL">
        <span class="text-muted-foreground text-sm font-medium">Status</span>
        <div>
          <WishlistItemStatusBadge
            :is-purchased="item.isPurchased"
            :is-active="item.isActive"
          />
        </div>
      </div>

      <!-- Actions -->
      <div :class="CELL">
        <span class="text-muted-foreground text-sm font-medium">Aktionen</span>
        <WishlistItemActions
          :item="item"
          @open-url="$emit('openUrl', $event)"
          @edit="$emit('edit', $event)"
          @move="$emit('move', $event)"
          @toggle-purchased="
            (id, purchased) => $emit('togglePurchased', id, purchased)
          "
          @toggle-active="(id, active) => $emit('toggleActive', id, active)"
          @remove="$emit('remove', $event)"
        />
      </div>
    </div>
  </div>
</template>
