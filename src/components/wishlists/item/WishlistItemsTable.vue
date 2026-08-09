<script setup lang="ts">
import type { WishlistItem } from '@/db/schema/wishlists'
import WishlistItemCard from './WishlistItemCard.vue'
import WishlistItemRow from './WishlistItemRow.vue'
import WishlistItemsPagination from './WishlistItemsPagination.vue'
import WishlistItemsToolbar from './WishlistItemsToolbar.vue'

/**
 * The populated state of the item list: toolbar, the row/card table and
 * pagination. Kept apart from WishlistItemsView so that component is only
 * concerned with loading, error and empty states plus its dialogs.
 */
defineProps<{
  items: WishlistItem[]
  filteredItems: WishlistItem[]
  totalSum: number
  activeSum: number
  pagination: { offset: number; limit: number; total: number; hasMore: boolean }
}>()

const filter = defineModel<string>('filter', { required: true })

defineEmits<{
  openUrl: [url: string]
  edit: [item: WishlistItem]
  move: [item: WishlistItem]
  togglePurchased: [itemId: string, purchased: boolean]
  toggleActive: [itemId: string, active: boolean]
  remove: [item: WishlistItem]
  previousPage: []
  nextPage: []
}>()
</script>

<template>
  <div class="@container space-y-4">
    <WishlistItemsToolbar
      v-model:filter="filter"
      :shown-count="filteredItems.length"
      :total-count="items.length"
      :total-sum="totalSum"
      :active-sum="activeSum"
    />

    <!-- Custom Rich Table -->
    <div class="@container overflow-hidden rounded-lg border">
      <!-- Desktop Table Header -->
      <div class="bg-muted/50 border-b px-6 py-4 @max-3xl:hidden">
        <div class="grid grid-cols-14 items-center gap-4 text-sm font-medium">
          <div class="col-span-1">Bild</div>
          <div class="col-span-5">Name & Beschreibung</div>
          <div class="col-span-2">Preis</div>
          <div class="col-span-2">Priorität</div>
          <div class="col-span-2">Status</div>
          <div class="col-span-2">Aktionen</div>
        </div>
      </div>

      <!-- Table Body -->
      <div class="divide-y">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="hover:bg-muted/20 transition-colors"
          :class="{ 'opacity-60': !item.isActive || item.isPurchased }"
        >
          <!-- Desktop Row Layout -->
          <WishlistItemRow
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

          <!-- Mobile Card Layout -->
          <WishlistItemCard
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

    <WishlistItemsPagination
      v-if="pagination.total > pagination.limit"
      :offset="pagination.offset"
      :limit="pagination.limit"
      :total="pagination.total"
      :has-more="pagination.hasMore"
      @previous="$emit('previousPage')"
      @next="$emit('nextPage')"
    />
  </div>
</template>
