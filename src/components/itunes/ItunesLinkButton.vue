<template>
  <Button v-if="href" variant="outline" as-child class="w-full">
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center"
    >
      <ExternalLink class="mr-1 h-3 w-3" />
      In iTunes ansehen
    </a>
  </Button>
</template>

<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

/**
 * "In iTunes ansehen" link, rendered only when there is somewhere to link to.
 *
 * The search and watchlist grids each carried their own copy of this button
 * including an inlined external-link icon.
 */
defineProps<{ href?: string | null }>()
</script>
