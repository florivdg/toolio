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
  emptyItemFormData,
  resetItemFormData,
  submitItemForm,
  toItemRequestData,
} from '@/lib/wishlists/item-form'
import type { WishlistItemFormData } from '@/lib/wishlists/item-form'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogScrollContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
const formData = reactive(emptyItemFormData())

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
const resetForm = () => resetItemFormData(formData)

// Update form data from magic button
const updateFormData = (newFormData: WishlistItemFormData) => {
  Object.assign(formData, newFormData)
}

// Handle form submission
const handleSubmit = async () => {
  const result = await submitItemForm(isSubmitting, {
    action: () =>
      createItemMutation.mutateAsync({
        wishlistId: props.wishlistId,
        data: toItemRequestData(formData),
      }),
    log: 'Error creating wishlist item',
    fallbackMessage: 'Fehler beim Hinzufügen des Artikels',
  })

  if (!result) return

  emit('created', result)

  // Reset form and close dialog. The success toast is the parent's job.
  resetForm()
  isOpen.value = false
}
</script>
