<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Artikel verschieben</DialogTitle>
        <DialogDescription>
          Wählen Sie die Ziel-Wunschliste, um "{{ item?.name }}" zu verschieben.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="target-wishlist">Ziel-Wunschliste</Label>
          <Select v-model="selectedWishlistId" class="w-full">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Wunschliste auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="list in availableWishlists"
                :key="list.id"
                :value="list.id"
              >
                {{ list.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter class="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button @click="moveItem" :disabled="!selectedWishlistId || isMoving">
            <span v-if="isMoving">Verschieben...</span>
            <span v-else>Verschieben</span>
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { useWishlistsQuery, useMoveWishlistItemMutation } from '@/lib/wishlists/queries'
import type { WishlistItem } from '@/db/schema/wishlists'

// Props
interface Props {
  item: WishlistItem | null
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'moved', item: WishlistItem): void
}

const emit = defineEmits<Emits>()

// Reactive state
const isOpen = ref(props.modelValue)
const isMoving = ref(false)
const selectedWishlistId = ref('')

// Pinia Colada queries and mutations
const { state: wishlistsState } = useWishlistsQuery(50, 0)
const moveItemMutation = useMoveWishlistItemMutation()

// Computed available wishlists (excluding current wishlist)
const availableWishlists = computed(() => {
  if (!wishlistsState.value.data?.data || !props.item) return []
  return wishlistsState.value.data.data.filter(
    (wishlist) => wishlist.id !== props.item?.wishlistId
  )
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      selectedWishlistId.value = ''
    }
  },
)

// Watch for internal changes to isOpen and emit
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
  if (!newValue) {
    // Reset state when modal closes
    selectedWishlistId.value = ''
  }
})


// Move item to selected wishlist
const moveItem = async () => {
  if (!props.item || !selectedWishlistId.value) {
    return
  }

  try {
    isMoving.value = true

    const movedItem = await moveItemMutation.mutate({
      fromWishlistId: props.item.wishlistId,
      toWishlistId: selectedWishlistId.value,
      itemId: props.item.id,
    })

    // Emit the moved item
    emit('moved', movedItem)

    // Close dialog
    isOpen.value = false
    
    // Toast success message is handled by parent component
  } catch (err) {
    console.error('Error moving item:', err)
    toast.error(
      err instanceof Error
        ? err.message
        : 'Fehler beim Verschieben des Artikels',
    )
  } finally {
    isMoving.value = false
  }
}
</script>
