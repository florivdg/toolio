<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SearchParams } from '@/lib/itunes/search'

const searchTerm = ref('')
const mediaType = ref('movie')

interface Props {
  isLoading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  search: [SearchParams]
}>()

const handleSearch = () => {
  if (searchTerm.value) {
    emit('search', {
      term: searchTerm.value,
      media: mediaType.value,
    })
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSearch()
  }
}
</script>

<template>
  <div class="flex w-full max-w-2xl gap-2">
    <div class="flex-1">
      <Input
        v-model.trim="searchTerm"
        type="text"
        placeholder="Suche nach Filmen oder Serien..."
        class="w-full"
        @keydown="handleKeydown"
      />
    </div>

    <Select v-model="mediaType">
      <SelectTrigger class="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="movie"> Film </SelectItem>
        <SelectItem value="tvShow"> Serie </SelectItem>
      </SelectContent>
    </Select>

    <Button
      @click="handleSearch"
      :disabled="!searchTerm || isLoading"
      class="px-4"
    >
      <Search class="h-4 w-4" />
      <span class="sr-only">Suchen</span>
    </Button>
  </div>
</template>
