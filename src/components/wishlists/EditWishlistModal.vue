<template>
  <WishlistModal
    mode="edit"
    :model-value="modelValue"
    :show-trigger="showTrigger"
    :wishlist="wishlist"
    @update:model-value="emit('update:modelValue', $event)"
    @success="emit('updated', $event)"
  >
    <template #trigger>
      <slot name="trigger">
        <Button>
          <Edit2 class="mr-2 h-4 w-4" />
          Wishlist bearbeiten
        </Button>
      </slot>
    </template>
  </WishlistModal>
</template>

<script setup lang="ts">
import { Edit2 } from 'lucide-vue-next'
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
</script>
