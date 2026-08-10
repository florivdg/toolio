<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  offset: number
  limit: number
  total: number
  hasMore: boolean
}>()

defineEmits<{ previous: []; next: [] }>()

const firstShown = computed(() => props.offset + 1)
const lastShown = computed(() =>
  Math.min(props.offset + props.limit, props.total),
)
</script>

<template>
  <div class="flex items-center justify-between pt-4">
    <div class="text-muted-foreground text-sm">
      Zeige {{ firstShown }} bis {{ lastShown }} von {{ total }} Artikeln
    </div>
    <div class="flex gap-2">
      <Button
        @click="$emit('previous')"
        :disabled="offset === 0"
        variant="outline"
        size="sm"
      >
        Vorherige
      </Button>
      <Button
        @click="$emit('next')"
        :disabled="!hasMore"
        variant="outline"
        size="sm"
      >
        Nächste
      </Button>
    </div>
  </div>
</template>
