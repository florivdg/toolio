<script setup lang="ts">
import type { WishlistItem } from '@/db/schema/wishlists'
import WishlistItemActions from './WishlistItemActions.vue'
import WishlistItemPrice from './WishlistItemPrice.vue'
import WishlistItemPriority from './WishlistItemPriority.vue'
import WishlistItemStatusBadge from './WishlistItemStatusBadge.vue'
import WishlistItemThumbnail from './WishlistItemThumbnail.vue'

/** Wide-viewport table row. The mobile counterpart is WishlistItemCard.vue. */
defineProps<{ item: WishlistItem }>()

defineEmits<{
  openUrl: [url: string]
  edit: [item: WishlistItem]
  move: [item: WishlistItem]
  togglePurchased: [itemId: string, purchased: boolean]
  toggleActive: [itemId: string, active: boolean]
  remove: [item: WishlistItem]
}>()
</script>

<template>
  <div class="grid grid-cols-14 items-center gap-4 px-6 py-4 @max-3xl:hidden">
    <!-- Image -->
    <div class="col-span-1">
      <WishlistItemThumbnail :src="item.imageUrl" :alt="item.name" />
    </div>

    <!-- Name & Description -->
    <div class="col-span-5 min-w-0">
      <div class="truncate font-medium" :title="item.name">
        {{ item.name }}
      </div>
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

    <!-- Price -->
    <div class="col-span-2">
      <WishlistItemPrice :price="item.price" />
    </div>

    <!-- Priority -->
    <div class="col-span-2">
      <WishlistItemPriority :priority="item.priority" />
    </div>

    <!-- Status -->
    <div class="col-span-2">
      <div class="flex flex-col gap-1">
        <WishlistItemStatusBadge
          :is-purchased="item.isPurchased"
          :is-active="item.isActive"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="col-span-2">
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
</template>
