<template>
  <Card
    class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
    @click="emit('open', wishlist.id)"
  >
    <CardHeader class="pb-3">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <CardTitle class="text-lg">{{ wishlist.name }}</CardTitle>
          <CardDescription v-if="wishlist.description" class="mt-1">
            {{ wishlist.description }}
          </CardDescription>
        </div>
        <Badge variant="secondary" class="ml-2 flex-shrink-0">
          {{ wishlist.itemCount || 0 }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <!-- Latest Items Preview -->
      <div v-if="latestItems.length > 0" class="space-y-3">
        <div class="text-muted-foreground text-sm font-medium">
          Neueste Artikel:
        </div>
        <div class="space-y-2">
          <WishlistCardItem
            v-for="item in latestItems"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
      <div v-else class="py-8 text-center">
        <FileText class="text-muted-foreground/50 mx-auto mb-3 h-8 w-8" />
        <p class="text-muted-foreground text-sm">
          Noch keine Artikel hinzugefügt
        </p>
      </div>
    </CardContent>
    <CardFooter class="pt-3">
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        @click.stop="emit('open', wishlist.id)"
      >
        Wishlist anzeigen
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText } from 'lucide-vue-next'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import WishlistCardItem from './WishlistCardItem.vue'
import type { WishlistWithItems } from '@/lib/wishlists/normalize'

/** One wishlist tile in the overview grid. */
const props = defineProps<{ wishlist: WishlistWithItems }>()

const emit = defineEmits<{ open: [wishlistId: string] }>()

// Older list responses omit latestItems entirely, so the template must not
// reach into it directly.
const latestItems = computed(() => props.wishlist.latestItems ?? [])
</script>
