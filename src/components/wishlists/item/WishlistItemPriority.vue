<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'

const props = defineProps<{ priority?: number | null }>()

const filled = computed(() => props.priority || 0)
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex">
      <Star
        v-for="star in 5"
        :key="star"
        class="h-4 w-4"
        :class="
          star <= filled
            ? 'fill-yellow-500 text-yellow-500'
            : 'text-muted-foreground'
        "
      />
    </div>
    <span class="text-muted-foreground text-xs">({{ filled }})</span>
  </div>
</template>
