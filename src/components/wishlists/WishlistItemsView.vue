<template>
  <div>
    <WishlistItemsHeader
      :wishlist-id="wishlistId"
      :name="wishlistName"
      :description="wishlistDescription"
      @item-created="onItemCreated"
      @edit-wishlist="openEditWishlistModal"
      @delete-wishlist="confirmDeleteWishlist"
      @back="router.push('/tools/wishlists')"
    />

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="bg-muted h-12 animate-pulse rounded"></div>
      <div class="bg-muted h-32 animate-pulse rounded"></div>
      <div class="bg-muted h-32 animate-pulse rounded"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12 text-center">
      <div class="text-destructive">
        <p class="text-lg font-semibold">Fehler beim Laden</p>
        <p class="text-muted-foreground mt-2">{{ error }}</p>
        <Button @click="refetchItems" variant="outline" class="mt-4">
          Nochmal versuchen
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="py-12 text-center">
      <div class="text-muted-foreground space-y-4">
        <div>
          <FileText class="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
          <p class="text-lg">Keine Artikel vorhanden</p>
          <p>Diese Wunschliste ist noch leer.</p>
        </div>
        <CreateWishlistItemModal
          :wishlist-id="wishlistId"
          @created="onItemCreated"
        >
          <template #trigger>
            <Button> Ersten Artikel hinzufügen </Button>
          </template>
        </CreateWishlistItemModal>
      </div>
    </div>

    <WishlistItemsTable
      v-else
      v-model:filter="filter"
      :items="items"
      :filtered-items="filteredItems"
      :total-sum="totalSum"
      :active-sum="activeSum"
      :pagination="currentPagination"
      @open-url="openUrl"
      @edit="openEditModal"
      @move="openMoveItemDialog"
      @toggle-purchased="togglePurchased"
      @toggle-active="toggleActive"
      @remove="confirmDeleteItem"
      @previous-page="loadPreviousPage"
      @next-page="loadNextPage"
    />

    <!-- Edit Modal -->
    <EditWishlistItemModal
      :item="itemBeingEdited"
      v-model="isEditModalOpen"
      :show-trigger="false"
      @updated="onItemUpdated"
      @update:model-value="handleEditModalClose"
    />

    <!-- Edit Wishlist Modal -->
    <EditWishlistModal
      v-if="wishlistData"
      :wishlist="wishlistData"
      v-model="isEditWishlistModalOpen"
      :show-trigger="false"
      @updated="onWishlistUpdated"
    />

    <!-- Move Item Dialog -->
    <MoveWishlistItemDialog
      :item="moveItemDialog.item"
      v-model="moveItemDialog.open"
      @moved="onItemMoved"
    />

    <ConfirmDeleteDialog
      v-model:open="deleteDialog.open"
      title="Artikel löschen"
      :description="deleteItemDescription"
      :loading="deleteDialog.loading"
      @confirm="deleteItem"
    />

    <ConfirmDeleteDialog
      v-model:open="deleteWishlistDialog.open"
      title="Wishlist löschen"
      :description="deleteWishlistDescription"
      :loading="deleteWishlistDialog.loading"
      @confirm="deleteWishlist"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import CreateWishlistItemModal from './CreateWishlistItemModal.vue'
import EditWishlistItemModal from './EditWishlistItemModal.vue'
import EditWishlistModal from './EditWishlistModal.vue'
import MoveWishlistItemDialog from './MoveWishlistItemDialog.vue'
import ConfirmDeleteDialog from './item/ConfirmDeleteDialog.vue'
import WishlistItemsHeader from './item/WishlistItemsHeader.vue'
import WishlistItemsTable from './item/WishlistItemsTable.vue'
import { toast } from 'vue-sonner'
import {
  useWishlistQuery,
  useWishlistItemsQuery,
  useDeleteWishlistMutation,
  useDeleteWishlistItemMutation,
  useUpdateWishlistItemStatusMutation,
  type WishlistWithItems,
} from '@/lib/wishlists/queries'
import type { WishlistItem } from '@/db/schema/wishlists'
import { FileText } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const wishlistId = computed(() => route.params.id as string)


// UI State
const filter = ref('all')
const editingItem = ref<WishlistItem | null>(null)
const isEditModalOpen = ref(false)
const pagination = ref({
  limit: 20,
  offset: 0,
})

// Delete dialog state
const deleteDialog = ref({
  open: false,
  loading: false,
  item: null as WishlistItem | null,
})

// Delete wishlist dialog state
const deleteWishlistDialog = ref({
  open: false,
  loading: false,
})

// Edit wishlist modal state
const isEditWishlistModalOpen = ref(false)

// Move item dialog state
const moveItemDialog = ref({
  open: false,
  item: null as WishlistItem | null,
})

// Pinia Colada queries
const { 
  data: wishlistData, 
  isLoading: wishlistLoading,
  error: wishlistError 
} = useWishlistQuery(wishlistId)

const { 
  data: itemsData, 
  isLoading: itemsLoading, 
  error: itemsError,
  refetch: refetchItems 
} = useWishlistItemsQuery(wishlistId, pagination.value.limit, pagination.value.offset)

// Mutations
const deleteWishlistMutation = useDeleteWishlistMutation()
const deleteItemMutation = useDeleteWishlistItemMutation()
const updateItemStatusMutation = useUpdateWishlistItemStatusMutation()

// Computed properties
const items = computed(() => itemsData.value?.data || [])
const loading = computed(() => itemsLoading.value || wishlistLoading.value)
const error = computed(() => itemsError.value?.message || wishlistError.value?.message || null)
const hasMore = computed(() => itemsData.value?.pagination?.hasMore || false)
const currentPagination = computed(() => itemsData.value?.pagination || {
  limit: 20,
  offset: 0,
  total: 0,
  hasMore: false,
})

// Create a default item for when no item is being edited
const defaultItem: WishlistItem = {
  id: '',
  wishlistId: '',
  name: '',
  description: '',
  price: 0,
  url: '',
  imageUrl: '',
  isActive: true,
  isPurchased: false,
  priority: 3,
  notes: '',
  createdAt: '',
  updatedAt: '',
}

// Computed
const filteredItems = computed(() => {
  let filtered = items.value

  switch (filter.value) {
    case 'active':
      filtered = filtered.filter((item) => item.isActive && !item.isPurchased)
      break
    case 'purchased':
      filtered = filtered.filter((item) => item.isPurchased)
      break
    case 'unpurchased':
      filtered = filtered.filter((item) => !item.isPurchased)
      break
    default:
      // 'all' - no filtering
      break
  }

  return filtered
})

// Price totals
const totalSum = computed(() => {
  return items.value.reduce((sum, item) => {
    return sum + (item.price || 0)
  }, 0)
})

const activeSum = computed(() => {
  return items.value
    .filter((item) => item.isActive && !item.isPurchased)
    .reduce((sum, item) => {
      return sum + (item.price || 0)
    }, 0)
})

// Presentation strings, kept out of the template so it stays free of optional
// chaining and long interpolations.
const wishlistName = computed(() => wishlistData.value?.name)
const wishlistDescription = computed(() => wishlistData.value?.description)
const itemBeingEdited = computed(() => editingItem.value || defaultItem)

const deleteItemDescription = computed(
  () =>
    `Sind Sie sicher, dass Sie den Artikel "${deleteDialog.value.item?.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
)

const deleteWishlistDescription = computed(
  () =>
    `Sind Sie sicher, dass Sie die Wishlist "${wishlistData.value?.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden und alle Artikel in dieser Wishlist werden ebenfalls gelöscht.`,
)

// Methods using mutations
const togglePurchased = async (itemId: string, purchased: boolean) => {
  try {
    await updateItemStatusMutation.mutateAsync({
      wishlistId: wishlistId.value,
      itemId,
      status: 'purchase',
      value: purchased,
    })
    
    toast.success(
      purchased
        ? 'Artikel als gekauft markiert!'
        : 'Artikel als nicht gekauft markiert!',
    )
  } catch (err) {
    console.error('Error updating purchase status:', err)
    toast.error('Fehler beim Aktualisieren des Kaufstatus')
  }
}

const toggleActive = async (itemId: string, active: boolean) => {
  try {
    await updateItemStatusMutation.mutateAsync({
      wishlistId: wishlistId.value,
      itemId,
      status: 'active',
      value: active,
    })
    
    toast.success(
      active
        ? 'Artikel aktiviert!'
        : 'Artikel deaktiviert!',
    )
  } catch (err) {
    console.error('Error updating active status:', err)
    toast.error('Fehler beim Aktualisieren des Aktivitätsstatus')
  }
}

const openUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openEditModal = (item: WishlistItem) => {
  editingItem.value = item
  isEditModalOpen.value = true
}

const openMoveItemDialog = (item: WishlistItem) => {
  moveItemDialog.value.item = item
  moveItemDialog.value.open = true
}

const handleEditModalClose = (isOpen: boolean) => {
  isEditModalOpen.value = isOpen
  if (!isOpen) {
    editingItem.value = null
  }
}

const loadNextPage = () => {
  if (hasMore.value) {
    pagination.value.offset += pagination.value.limit
    refetchItems()
  }
}

const loadPreviousPage = () => {
  if (pagination.value.offset > 0) {
    pagination.value.offset = Math.max(
      0,
      pagination.value.offset - pagination.value.limit,
    )
    refetchItems()
  }
}

// Event handlers for modal callbacks - mutations will handle cache invalidation
const onItemCreated = (newItem: WishlistItem) => {
  // Mutations handle cache invalidation, so we just show feedback
  toast.success('Artikel erfolgreich erstellt!')
}

const onItemUpdated = (updatedItem: WishlistItem) => {
  // Mutations handle cache invalidation, so we just show feedback
  toast.success('Artikel erfolgreich aktualisiert!')
}

const onItemMoved = (movedItem: WishlistItem) => {
  // Close the move dialog
  moveItemDialog.value.open = false
  moveItemDialog.value.item = null
  
  toast.success('Artikel erfolgreich verschoben!')
}

// Confirm delete item
const confirmDeleteItem = (item: WishlistItem) => {
  deleteDialog.value.item = item
  deleteDialog.value.open = true
}

// Delete item using mutation
const deleteItem = async () => {
  if (!deleteDialog.value.item) return

  try {
    deleteDialog.value.loading = true

    await deleteItemMutation.mutateAsync({
      wishlistId: wishlistId.value,
      itemId: deleteDialog.value.item.id,
    })

    // Show success message
    toast.success('Artikel erfolgreich gelöscht')

    // Close dialog
    deleteDialog.value.open = false
    deleteDialog.value.item = null
  } catch (err) {
    console.error('Error deleting item:', err)
    const errorMessage =
      err instanceof Error ? err.message : 'Unbekannter Fehler'
    toast.error(`Fehler beim Löschen des Artikels: ${errorMessage}`)
  } finally {
    deleteDialog.value.loading = false
  }
}

// Confirm delete wishlist
const confirmDeleteWishlist = () => {
  deleteWishlistDialog.value.open = true
}

// Open edit wishlist modal
const openEditWishlistModal = () => {
  isEditWishlistModalOpen.value = true
}

// Handle wishlist updated
const onWishlistUpdated = (updatedWishlist: any) => {
  toast.success('Wishlist erfolgreich aktualisiert!')
}

// Delete wishlist using mutation
const deleteWishlist = async () => {
  if (!wishlistId.value) return

  try {
    deleteWishlistDialog.value.loading = true

    await deleteWishlistMutation.mutateAsync(wishlistId.value)

    // Show success message
    toast.success('Wishlist erfolgreich gelöscht')

    // Navigate back to wishlists overview
    router.push('/tools/wishlists')

    // Close dialog
    deleteWishlistDialog.value.open = false
  } catch (err) {
    console.error('Error deleting wishlist:', err)
    const errorMessage =
      err instanceof Error ? err.message : 'Unbekannter Fehler'
    toast.error(`Fehler beim Löschen der Wishlist: ${errorMessage}`)
  } finally {
    deleteWishlistDialog.value.loading = false
  }
}
</script>

<style scoped>
/* Custom scrollbar for overflow areas */
.overflow-hidden::-webkit-scrollbar {
  height: 4px;
}

.overflow-hidden::-webkit-scrollbar-track {
  background: var(--color-muted);
}

.overflow-hidden::-webkit-scrollbar-thumb {
  background: var(--color-muted-foreground);
  border-radius: 2px;
}

.overflow-hidden::-webkit-scrollbar-thumb:hover {
  background: var(--color-foreground);
}

/* Enhanced hover states using modern CSS features */
.hover\:bg-muted\/20:hover {
  background-color: color-mix(in srgb, var(--color-muted) 20%, transparent);
}

/* Modern transition using CSS custom properties */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: var(--ease-out, cubic-bezier(0.4, 0, 0.2, 1));
  transition-duration: var(--duration-150, 150ms);
}
</style>
