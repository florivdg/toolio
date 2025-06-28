<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button>
          <component :is="triggerIcon" class="mr-2 h-4 w-4" />
          {{ triggerText }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogScrollContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label :for="nameInputId">Name *</Label>
          <Input
            :id="nameInputId"
            v-model="formData.name"
            autocomplete="off"
            data-1p-ignore
            placeholder="z.B. Geburtstag, Weihnachten, ..."
            required
          />
        </div>
        <div class="space-y-2">
          <Label :for="descriptionInputId">Beschreibung (optional)</Label>
          <Textarea
            :id="descriptionInputId"
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
            <span v-if="isSubmitting">{{ submitLoadingText }}...</span>
            <span v-else>{{ submitText }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Plus, Edit2 } from 'lucide-vue-next'
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

interface WishlistRequest {
  name: string
  description?: string
}

interface WishlistResponse {
  success: boolean
  data?: Wishlist
  message?: string
}

// Props
interface Props {
  mode: 'create' | 'edit'
  modelValue?: boolean
  showTrigger?: boolean
  wishlist?: Wishlist
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  showTrigger: true,
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', wishlist: Wishlist): void
}

const emit = defineEmits<Emits>()

// Computed properties based on mode
const isEditMode = computed(() => props.mode === 'edit')

const triggerIcon = computed(() => (isEditMode.value ? Edit2 : Plus))

const triggerText = computed(() =>
  isEditMode.value ? 'Wishlist bearbeiten' : 'Neue Wishlist',
)

const title = computed(() =>
  isEditMode.value ? 'Wishlist bearbeiten' : 'Neue Wishlist erstellen',
)

const description = computed(() =>
  isEditMode.value
    ? 'Bearbeiten Sie die Details Ihrer Wunschliste.'
    : 'Erstellen Sie eine neue Wishlist, um Ihre Wünsche zu organisieren.',
)

const submitText = computed(() =>
  isEditMode.value ? 'Speichern' : 'Erstellen',
)

const submitLoadingText = computed(() =>
  isEditMode.value ? 'Speichern' : 'Erstelle',
)

const nameInputId = computed(() => (isEditMode.value ? 'edit-name' : 'name'))

const descriptionInputId = computed(() =>
  isEditMode.value ? 'edit-description' : 'description',
)

const apiEndpoint = computed(() =>
  isEditMode.value && props.wishlist?.id
    ? `/api/wishlists/${props.wishlist.id}`
    : '/api/wishlists',
)

const httpMethod = computed(() => (isEditMode.value ? 'PUT' : 'POST'))

const successMessage = computed(() =>
  isEditMode.value
    ? 'Wishlist erfolgreich aktualisiert!'
    : 'Wishlist erfolgreich erstellt!',
)

const errorMessage = computed(() =>
  isEditMode.value
    ? 'Fehler beim Aktualisieren der Wishlist'
    : 'Fehler beim Erstellen der Wishlist',
)

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
    if (newValue && isEditMode.value) {
      populateForm()
    }
  },
)

// Watch for internal changes to isOpen and emit
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
  if (newValue && isEditMode.value) {
    populateForm()
  }
})

// Watch for wishlist changes in edit mode
watch(
  () => props.wishlist,
  () => {
    if (isOpen.value && isEditMode.value) {
      populateForm()
    }
  },
  { deep: true, immediate: true },
)

// Populate form with current wishlist data (edit mode only)
const populateForm = () => {
  if (!isEditMode.value || !props.wishlist?.id) return

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

  if (isEditMode.value && (!props.wishlist || !props.wishlist.id)) {
    console.error('No valid wishlist to edit')
    return
  }

  try {
    isSubmitting.value = true

    const requestData: WishlistRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    }

    const fetchOptions: RequestInit = {
      method: httpMethod.value,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    // Only add body for non-GET requests
    if (httpMethod.value !== 'GET') {
      fetchOptions.body = JSON.stringify(requestData)
    }

    const response = await fetch(apiEndpoint.value, fetchOptions)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: WishlistResponse = await response.json()

    if (!data.success || !data.data) {
      throw new Error(data.message || errorMessage.value)
    }

    // Emit the success event with the wishlist data
    emit('success', data.data)

    // Reset form and close dialog
    if (!isEditMode.value) {
      resetForm()
    }
    isOpen.value = false

    toast.success(successMessage.value)
  } catch (err) {
    console.error(
      `Error ${isEditMode.value ? 'updating' : 'creating'} wishlist:`,
      err,
    )
    toast.error(err instanceof Error ? err.message : errorMessage.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>
