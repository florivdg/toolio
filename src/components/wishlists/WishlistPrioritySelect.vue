<template>
  <Select v-model="priority">
    <SelectTrigger>
      <SelectValue placeholder="Wählen Sie..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="option in PRIORITY_OPTIONS"
        :key="option.value"
        :value="option.value"
      >
        <div class="flex items-center gap-2">
          <div class="flex">
            <Star v-for="n in Number(option.value)" :key="n" class="h-4 w-4" />
          </div>
          {{ option.label }} ({{ option.value }})
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRIORITY_OPTIONS } from '@/lib/wishlists/item-form'

/**
 * The 1-5 priority picker.
 *
 * The five options were written out by hand, each repeating the star markup one
 * more time than the last; they are generated from the option list instead.
 */
const priority = defineModel<string>({ required: true })
</script>
