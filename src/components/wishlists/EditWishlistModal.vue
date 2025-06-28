<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button>
          <Edit2 class="mr-2 h-4 w-4" />
          Wishlist bearbeiten
        </Button>
      </slot>
    </DialogTrigger>
    <DialogScrollContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Wishlist bearbeiten</DialogTitle>
        <DialogDescription>
          Bearbeiten Sie die Details Ihrer Wunschliste.
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="edit-name">Name *</Label>
          <Input
            id="edit-name"
            v-model="formData.name"
            autocomplete="off"
            data-1p-ignore
            placeholder="z.B. Geburtstag, Weihnachten, ..."
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="edit-description">Beschreibung (optional)</Label>
          <Textarea
            id="edit-description"
            v-model="formData.description"
            placeholder="Kurze Beschreibung der Wishlist..."
            rows="3"
          />
        </div>
        <DialogFooter class="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            type="submit"
            :disabled="!formData.name.trim() || isSubmitting"
          >
            <span v-if="isSubmitting">Speichern...</span>
            <span v-else>Speichern</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Edit2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogScrollContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'vue-sonner'

// Types
interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: Date | string
  updatedAt?: Date | string
  itemCount?: number
}

interface UpdateWishlistRequest {
  name: string
  description?: string
}

interface UpdateWishlistResponse {
  success: boolean
  data?: Wishlist
  message?: string
}

// Props
interface Props {
  wishlist: Wishlist
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
  (e: 'updated', wishlist: Wishlist): void
}

const emit = defineEmits<Emits>()

// Reactive state
const isOpen = ref(props.modelValue)
const isSubmitting = ref(false)
const formData = reactive({
  name: '',
  description: '',
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

// Watch for wishlist changes
watch(
  () => props.wishlist,
  () => {
    if (isOpen.value) {
      populateForm()
    }
  },
  { deep: true, immediate: true },
)

// Populate form with current wishlist data
const populateForm = () => {
  if (!props.wishlist || !props.wishlist.id) return
  
  formData.name = props.wishlist.name
  formData.description = props.wishlist.description || ''
}

// Reset form data
const resetForm = () => {
  formData.name = ''
  formData.description = ''
}

// Handle form submission
const handleSubmit = async () => {
  if (!formData.name.trim()) {
    toast.error('Bitte geben Sie einen Namen ein.')
    return
  }

  if (!props.wishlist || !props.wishlist.id) {
    console.error('No valid wishlist to edit')
    return
  }

  try {
    isSubmitting.value = true

    const requestData: UpdateWishlistRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    }

    const response = await fetch(`/api/wishlists/${props.wishlist.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: UpdateWishlistResponse = await response.json()

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Fehler beim Aktualisieren der Wishlist')
    }

    // Emit the updated wishlist
    emit('updated', data.data)

    // Close dialog
    isOpen.value = false

    toast.success('Wishlist erfolgreich aktualisiert!')
  } catch (err) {
    console.error('Error updating wishlist:', err)
    toast.error(
      err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Wishlist',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>