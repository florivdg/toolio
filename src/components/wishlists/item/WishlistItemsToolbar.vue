<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/wishlists/helpers'

defineProps<{
  shownCount: number
  totalCount: number
  totalSum: number
  activeSum: number
}>()

const filter = defineModel<string>('filter', { required: true })
</script>

<template>
  <div
    class="space-y-4 @2xl:flex @2xl:items-start @2xl:justify-between @2xl:space-y-0"
  >
    <!-- Left side: Filter and count -->
    <div class="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:gap-4">
      <div class="flex items-center gap-2">
        <label class="shrink-0 text-sm font-medium">Filter:</label>
        <Select v-model="filter">
          <SelectTrigger class="w-full min-w-0 @sm:w-48 @lg:w-56">
            <SelectValue placeholder="Alle anzeigen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle anzeigen</SelectItem>
            <SelectItem value="active">Nur aktive</SelectItem>
            <SelectItem value="purchased">Gekauft</SelectItem>
            <SelectItem value="unpurchased">Noch nicht gekauft</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="text-muted-foreground shrink-0 text-sm @lg:border-l @lg:pl-4">
        {{ shownCount }} von {{ totalCount }} Artikel{{
          totalCount !== 1 ? 'n' : ''
        }}
      </div>
    </div>

    <!-- Right side: Price Summary -->
    <div
      v-if="totalCount > 0"
      class="text-sm font-medium @2xl:flex-shrink-0 @2xl:text-right"
    >
      <div
        class="flex flex-col gap-1 @md:flex-row @md:items-center @md:gap-3 @2xl:flex-col @2xl:items-end @2xl:gap-0"
      >
        <div class="flex items-center gap-2 @2xl:justify-end">
          <span class="text-muted-foreground shrink-0">Gesamtwert:</span>
          <span class="font-semibold">{{ formatPrice(totalSum) }}</span>
        </div>
        <div
          v-if="activeSum !== totalSum"
          class="text-muted-foreground text-xs @2xl:text-sm"
        >
          ({{ formatPrice(activeSum) }} aktiv)
        </div>
      </div>
    </div>
  </div>
</template>
