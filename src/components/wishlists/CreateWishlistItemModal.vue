<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button>
          <Plus class="mr-2 h-4 w-4" />
          Artikel hinzufügen
        </Button>
      </slot>
    </DialogTrigger>
    <DialogScrollContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Neuen Artikel hinzufügen</DialogTitle>
        <DialogDescription>
          Fügen Sie einen neuen Artikel zu Ihrer Wunschliste hinzu.
        </DialogDescription>
      </DialogHeader>
      <WishlistItemForm
        :form-data="formData"
        :is-submitting="isSubmitting"
        submit-text="Hinzufügen"
        submit-loading-text="Hinzufügen..."
        field-prefix="create"
        @submit="handleSubmit"
        @update:form-data="updateFormData"
      />
    </DialogScrollContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogScrollContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import WishlistItemForm from './WishlistItemForm.vue'
import { useCreateWishlistItemMutation } from '@/lib/wishlists/queries'

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

interface CreateWishlistItemRequest {
  name: string
  description?: string | null
  price?: number | null
  url: string
  imageUrl?: string | null
  priority?: number
  notes?: string | null
}

interface CreateWishlistItemResponse {
  success: boolean
  data?: WishlistItem
  message?: string
}

// Props
interface Props {
  wishlistId: string
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
  (e: 'created', item: WishlistItem): void
}

const emit = defineEmits<Emits>()

// Use Pinia Colada mutation
const createItemMutation = useCreateWishlistItemMutation()

// Reactive state
const isOpen = ref(props.modelValue)
const formData = reactive({
  name: '',
  description: '',
  price: '',
  url: '',
  imageUrl: '',
  priority: '3',
  notes: '',
})

// Computed state
const isSubmitting = computed(
  () => createItemMutation.asyncStatus.value === 'loading',
)

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
  },
)

// Watch for internal changes to isOpen and emit
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

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

// Update form data from magic button
const updateFormData = (newFormData: typeof formData) => {
  Object.assign(formData, newFormData)
}

// Handle form submission
const handleSubmit = async () => {
  try {
    const requestData = {
      wishlistId: props.wishlistId,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      url: formData.url.trim(),
      imageUrl: formData.imageUrl.trim() || undefined,
      priority: parseInt(formData.priority),
      notes: formData.notes.trim() || undefined,
    }

    const data = await createItemMutation.mutateAsync(requestData)

    // Emit the created item
    emit('created', data)

    // Reset form and close dialog
    resetForm()
    isOpen.value = false

    toast.success('Artikel erfolgreich hinzugefügt!')
  } catch (err) {
    console.error('Error creating wishlist item:', err)
    toast.error(
      err instanceof Error
        ? err.message
        : 'Fehler beim Hinzufügen des Artikels',
    )
  }
}
</script>
