<script setup lang="ts">
import { Edit2, MoreHorizontal, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CreateWishlistItemModal from '../CreateWishlistItemModal.vue'

defineProps<{
  wishlistId: string
  name?: string | null
  description?: string | null
}>()

defineEmits<{
  itemCreated: [item: unknown]
  editWishlist: []
  deleteWishlist: []
  back: []
}>()
</script>

<template>
  <div class="@container mb-6">
    <div
      class="flex flex-col gap-4 @2xl:flex-row @2xl:items-start @2xl:justify-between"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-xl font-bold @md:text-2xl">
          {{ name || 'Wunschliste' }}
        </h2>
        <p class="text-muted-foreground mt-2 text-sm @md:text-base">
          {{ description || 'Artikel in dieser Wunschliste' }}
        </p>
      </div>
      <div class="flex flex-col gap-2 @md:flex-row @2xl:flex-shrink-0">
        <CreateWishlistItemModal
          :wishlist-id="wishlistId"
          @created="$emit('itemCreated', $event)"
          class="w-full @md:w-auto"
        />

        <!-- More Actions Dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" class="w-full @md:w-auto">
              <MoreHorizontal class="mr-2 h-4 w-4" />
              <span class="@max-lg:hidden">Aktionen</span>
              <span class="@lg:hidden">Mehr</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem
              @click="$emit('editWishlist')"
              class="cursor-pointer"
            >
              <Edit2 class="mr-2 h-4 w-4" />
              Wishlist bearbeiten
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              @click="$emit('deleteWishlist')"
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              Wishlist löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          @click="$emit('back')"
          variant="outline"
          class="w-full @md:w-auto"
        >
          <span class="@max-xl:hidden">Zurück zur Übersicht</span>
          <span class="@xl:hidden">Zurück</span>
        </Button>
      </div>
    </div>
  </div>
</template>
