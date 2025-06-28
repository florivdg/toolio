<template>
  <WishlistModal
    mode="create"
    :model-value="modelValue"
    :show-trigger="showTrigger"
    @update:model-value="emit('update:modelValue', $event)"
    @success="emit('created', $event)"
  >
    <template #trigger>
      <slot name="trigger">
        <Button>
          <Plus class="mr-2 h-4 w-4" />
          Neue Wishlist
        </Button>
      </slot>
    </template>
  </WishlistModal>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import WishlistModal from './WishlistModal.vue'

// Types
interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: Date | string
  updatedAt?: Date | string
  itemCount?: number
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
</script>
