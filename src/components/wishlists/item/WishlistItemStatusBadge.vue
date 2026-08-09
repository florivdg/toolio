<script setup lang="ts">
import { CheckCircle, Pause, ShoppingCart } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'

defineProps<{ isPurchased?: boolean | null; isActive?: boolean | null }>()
</script>

<template>
  <Badge
    v-if="isPurchased"
    variant="default"
    class="flex w-fit items-center gap-1"
  >
    <CheckCircle class="h-3 w-3" />
    Gekauft
  </Badge>
  <Badge
    v-else-if="!isActive"
    variant="secondary"
    class="flex w-fit items-center gap-1"
  >
    <Pause class="h-3 w-3" />
    Inaktiv
  </Badge>
  <Badge v-else variant="outline" class="flex w-fit items-center gap-1">
    <ShoppingCart class="h-3 w-3" />
    Aktiv
  </Badge>
</template>
