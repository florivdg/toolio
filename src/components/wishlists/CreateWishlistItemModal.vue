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
import { ref, reactive, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogScrollContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import WishlistItemForm from './WishlistItemForm.vue'
import { useCreateWishlistItemMutation } from '@/lib/wishlists/queries'
import type { WishlistItem } from '@/db/schema/wishlists'

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

// Pinia Colada mutation
const createItemMutation = useCreateWishlistItemMutation()

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
    isSubmitting.value = true

    const requestData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      url: formData.url.trim(),
      imageUrl: formData.imageUrl.trim() || undefined,
      priority: parseInt(formData.priority),
      notes: formData.notes.trim() || undefined,
    }

    const result = await createItemMutation.mutate({
      wishlistId: props.wishlistId,
      data: requestData,
    })

    // Emit the created item
    emit('created', result)

    // Reset form and close dialog
    resetForm()
    isOpen.value = false

    // Toast success message is handled by parent component
  } catch (err) {
    console.error('Error creating wishlist item:', err)
    toast.error(
      err instanceof Error
        ? err.message
        : 'Fehler beim Hinzufügen des Artikels',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>
