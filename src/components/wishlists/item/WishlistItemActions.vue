<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowRight,
  CheckCircle,
  Edit2,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  UndoIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WishlistItem } from '@/db/schema/wishlists'

/**
 * The link button and overflow menu shown for a wishlist item. The table row and
 * the mobile card render exactly the same set, so it lives here once.
 */
const props = defineProps<{ item: WishlistItem }>()

/**
 * The two toggles are each one menu entry whose icon, label and target value
 * flip with the item's state. Computing them keeps the template free of
 * v-if/v-else pairs that only differ in wording.
 */
const purchaseAction = computed(() =>
  props.item.isPurchased
    ? { icon: UndoIcon, label: 'Rückgängig machen', next: false }
    : { icon: CheckCircle, label: 'Als gekauft markieren', next: true },
)

const activeAction = computed(() =>
  props.item.isActive
    ? { icon: Pause, label: 'Deaktivieren', next: false }
    : { icon: Play, label: 'Aktivieren', next: true },
)

const emit = defineEmits<{
  openUrl: [url: string]
  edit: [item: WishlistItem]
  move: [item: WishlistItem]
  togglePurchased: [itemId: string, purchased: boolean]
  toggleActive: [itemId: string, active: boolean]
  remove: [item: WishlistItem]
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Primary Action: Link -->
    <Button
      v-if="item.url"
      @click="emit('openUrl', item.url)"
      size="sm"
      variant="outline"
      class="flex items-center gap-1"
    >
      <ExternalLink class="h-3 w-3" />
      Link
    </Button>

    <!-- Secondary Actions Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" class="h-8 w-8 p-0">
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <!-- Edit Action -->
        <DropdownMenuItem @click="emit('edit', item)" class="cursor-pointer">
          <Edit2 class="mr-2 h-4 w-4" />
          Bearbeiten
        </DropdownMenuItem>

        <!-- Move Action -->
        <DropdownMenuItem @click="emit('move', item)" class="cursor-pointer">
          <ArrowRight class="mr-2 h-4 w-4" />
          In andere Wunschliste verschieben
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <!-- Purchase Toggle -->
        <DropdownMenuItem
          @click="emit('togglePurchased', item.id!, purchaseAction.next)"
          class="cursor-pointer"
        >
          <component :is="purchaseAction.icon" class="mr-2 h-4 w-4" />
          {{ purchaseAction.label }}
        </DropdownMenuItem>

        <!-- Active Toggle -->
        <DropdownMenuItem
          @click="emit('toggleActive', item.id!, activeAction.next)"
          class="cursor-pointer"
        >
          <component :is="activeAction.icon" class="mr-2 h-4 w-4" />
          {{ activeAction.label }}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <!-- Delete Action -->
        <DropdownMenuItem
          @click="emit('remove', item)"
          class="text-destructive focus:text-destructive cursor-pointer"
        >
          <Trash2 class="mr-2 h-4 w-4" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
