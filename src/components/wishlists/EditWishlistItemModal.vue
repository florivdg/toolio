<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button size="sm" variant="ghost">
          <Edit2 class="h-3 w-3" />
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Artikel bearbeiten</DialogTitle>
        <DialogDescription>
          Bearbeiten Sie die Details dieses Artikels.
        </DialogDescription>
      </DialogHeader>

      <WishlistItemForm
        :form-data="formData"
        :is-submitting="isSubmitting"
        submit-text="Speichern"
        submit-loading-text="Speichern..."
        field-prefix="edit"
        @submit="handleSubmit"
      />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Edit2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import WishlistItemForm from './WishlistItemForm.vue'

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

interface UpdateWishlistItemRequest {
  name: string
  description?: string
  price?: number
  url: string
  imageUrl?: string
  priority?: number
  notes?: string
}

interface UpdateWishlistItemResponse {
  success: boolean
  data?: WishlistItem
  message?: string
}

// Props
interface Props {
  item: WishlistItem
  modelValue?: boolean
  showTrigger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  showTrigger: true,
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated', item: WishlistItem): void
}

const emit = defineEmits<Emits>()

// Reactive state
const isOpen = ref(props.modelValue)
const isSubmitting = ref(false)
const formData = reactive({
  name: '',
  description: '',
  price: '',
  url: '',
  imageUrl: '',
  priority: '3',
  notes: '',
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      // Populate form when modal opens
      populateForm()
    }
  },
)

// Watch for internal changes to isOpen and emit
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
  if (newValue) {
    populateForm()
  }
})

// Watch for item changes
watch(
  () => props.item,
  () => {
    if (isOpen.value) {
      populateForm()
    }
  },
  { deep: true, immediate: true },
)

// Populate form with current item data
const populateForm = () => {
  if (!props.item || !props.item.id) return

  formData.name = props.item.name
  formData.description = props.item.description || ''
  formData.price = props.item.price?.toString() || ''
  formData.url = props.item.url
  formData.imageUrl = props.item.imageUrl || ''
  formData.priority = (props.item.priority || 3).toString()
  formData.notes = props.item.notes || ''
}

// Reset form data
const resetForm = () => {
  formData.name = ''
  formData.description = ''
  formData.price = ''
  formData.url = ''
  formData.imageUrl = ''
  formData.priority = '3'
  formData.notes = ''
}

// Handle form submission
const handleSubmit = async () => {
  if (!props.item || !props.item.id) {
    console.error('No valid item to edit')
    return
  }

  try {
    isSubmitting.value = true

    const requestData: UpdateWishlistItemRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      url: formData.url.trim(),
      imageUrl: formData.imageUrl.trim() || undefined,
      priority: parseInt(formData.priority),
      notes: formData.notes.trim() || undefined,
    }

    const response = await fetch(
      `/api/wishlists/${props.item.wishlistId}/items/${props.item.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: UpdateWishlistItemResponse = await response.json()

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Fehler beim Aktualisieren des Artikels')
    }

    // Emit the updated item
    emit('updated', data.data)

    // Close dialog
    isOpen.value = false

    toast.success('Artikel erfolgreich aktualisiert!')
  } catch (err) {
    console.error('Error updating wishlist item:', err)
    toast.error(
      err instanceof Error
        ? err.message
        : 'Fehler beim Aktualisieren des Artikels',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>
