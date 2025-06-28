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
import { ref, watch, onMounted } from 'vue'
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

// Types
interface WishlistItem {
  id: string
  wishlistId: string
  name: string
  description?: string
  price?: number
  url: string
  imageUrl?: string
  isActive: boolean
  isPurchased: boolean
  priority?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
}

interface MoveItemRequest {
  targetWishlistId: string
}

interface MoveItemResponse {
  success: boolean
  data?: WishlistItem
  message?: string
}

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
const availableWishlists = ref<Wishlist[]>([])

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      // Fetch available wishlists when modal opens
      fetchWishlists()
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

// Fetch all wishlists for selection
const fetchWishlists = async () => {
  try {
    const response = await fetch('/api/wishlists')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.success && data.data) {
      // Filter out the current wishlist
      availableWishlists.value = data.data.filter(
        (wishlist: Wishlist) => wishlist.id !== props.item?.wishlistId,
      )
    } else {
      throw new Error(data.message || 'Fehler beim Laden der Wunschlisten')
    }
  } catch (err) {
    console.error('Error fetching wishlists:', err)
    toast.error(
      err instanceof Error ? err.message : 'Fehler beim Laden der Wunschlisten',
    )
  }
}

// Move item to selected wishlist
const moveItem = async () => {
  if (!props.item || !selectedWishlistId.value) {
    return
  }

  try {
    isMoving.value = true

    const requestData: MoveItemRequest = {
      targetWishlistId: selectedWishlistId.value,
    }

    const response = await fetch(
      `/api/wishlists/${props.item.wishlistId}/items/${props.item.id}/move`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: MoveItemResponse = await response.json()

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Fehler beim Verschieben des Artikels')
    }

    // Emit the moved item
    emit('moved', data.data)

    // Close dialog
    isOpen.value = false
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
