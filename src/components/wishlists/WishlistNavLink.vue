<template>
  <router-link :to="to" custom v-slot="{ isActive, href, navigate }">
    <Button
      asChild
      :variant="isActive ? 'default' : 'ghost'"
      size="sm"
      class="w-full min-w-0 justify-start"
      @click="navigate"
    >
      <a :href="href" class="flex min-w-0 items-center gap-2" :title="name">
        <FileText class="h-3 w-3 flex-shrink-0" />
        <span class="min-w-0 flex-1 truncate text-left">{{ name }}</span>
        <span
          v-if="itemCount !== undefined"
          class="text-muted-foreground ml-auto flex-shrink-0 text-xs"
        >
          {{ itemCount }}
        </span>
      </a>
    </Button>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

/** One wishlist entry in the sidebar. */
const props = defineProps<{
  id: string
  name: string
  itemCount?: number
}>()

const to = computed(() => `/tools/wishlists/${props.id}`)
</script>
