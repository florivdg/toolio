<template>
  <Dialog v-model:open="isOpen" @update:open="(open) => !open && resetForm()">
    <DialogTrigger asChild v-if="showTrigger">
      <slot name="trigger">
        <Button>
          <Plus class="mr-2 h-4 w-4" />
          Neue Wishlist
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Neue Wishlist erstellen</DialogTitle>
        <DialogDescription>
          Erstellen Sie eine neue Wishlist, um Ihre Wünsche zu organisieren.
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="name">Name *</Label>
          <Input
            id="name"
            v-model="formData.name"
            autocomplete="off"
            data-1p-ignore
            placeholder="z.B. Geburtstag, Weihnachten, ..."
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="description">Beschreibung (optional)</Label>
          <Textarea
            id="description"
            v-model="formData.description"
            placeholder="Kurze Beschreibung der Wishlist..."
            rows="3"
          />
        </div>
        <DialogFooter class="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline"> Abbrechen </Button>
          </DialogClose>
          <Button
            type="submit"
            :disabled="!formData.name.trim() || isSubmitting"
          >
            <span v-if="isSubmitting">Erstelle...</span>
            <span v-else>Erstellen</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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

interface CreateWishlistRequest {
  name: string
  description?: string
}

interface CreateWishlistResponse {
  success: boolean
  data?: Wishlist
  message?: string
}

// Props
interface Props {
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
  (e: 'created', wishlist: Wishlist): void
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
}

// Handle form submission
const handleSubmit = async () => {
  if (!formData.name.trim()) {
    toast.error('Bitte geben Sie einen Namen ein.')
    return
  }

  try {
    isSubmitting.value = true

    const requestData: CreateWishlistRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    }

    const response = await fetch('/api/wishlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: CreateWishlistResponse = await response.json()

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Fehler beim Erstellen der Wishlist')
    }

    // Emit the created wishlist
    emit('created', data.data)

    // Reset form and close dialog
    resetForm()
    isOpen.value = false

    toast.success('Wishlist erfolgreich erstellt!')
  } catch (err) {
    console.error('Error creating wishlist:', err)
    toast.error(
      err instanceof Error ? err.message : 'Fehler beim Erstellen der Wishlist',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>
