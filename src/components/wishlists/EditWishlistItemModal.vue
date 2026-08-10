<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button size="sm" variant="ghost">
          <Edit2 class="h-3 w-3" />
        </Button>
      </slot>
    </DialogTrigger>
    <DialogScrollContent class="sm:max-w-lg">
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
        @update:form-data="updateFormData"
      />
    </DialogScrollContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Edit2 } from 'lucide-vue-next'
import {
  emptyItemFormData,
  populateItemFormData,
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
import { useUpdateWishlistItemMutation } from '@/lib/wishlists/queries'
import type { WishlistItem } from '@/db/schema/wishlists'

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
const formData = reactive(emptyItemFormData())

// Pinia Colada mutation
const updateItemMutation = useUpdateWishlistItemMutation()

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

/**
 * Populate form with current item data.
 *
 * A function declaration rather than a const: the `immediate` watcher above
 * calls this during setup, so a const would still be in its temporal dead zone
 * whenever the modal is created already open.
 */
function populateForm() {
  if (!props.item?.id) return

  populateItemFormData(formData, props.item)
}

// Reset form data
const resetForm = () => resetItemFormData(formData)

// Update form data from magic button
const updateFormData = (newFormData: WishlistItemFormData) => {
  Object.assign(formData, newFormData)
}

// Handle form submission
const handleSubmit = async () => {
  const item = props.item

  if (!item?.id) {
    console.error('No valid item to edit')
    return
  }

  const result = await submitItemForm(isSubmitting, {
    action: () =>
      updateItemMutation.mutate({
        wishlistId: item.wishlistId,
        itemId: item.id,
        data: toItemRequestData(formData),
      }),
    log: 'Error updating wishlist item',
    fallbackMessage: 'Fehler beim Aktualisieren des Artikels',
  })

  if (!result) return

  emit('updated', result)
  isOpen.value = false
}
</script>
