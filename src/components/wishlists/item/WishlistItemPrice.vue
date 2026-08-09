<script setup lang="ts">
import { formatPrice } from '@/lib/wishlists/helpers'

defineProps<{ price?: number | null }>()
</script>

<template>
  <div v-if="price" class="font-medium">{{ formatPrice(price) }}</div>
  <div v-else class="text-muted-foreground text-sm">Kein Preis</div>
</template>
