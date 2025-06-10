<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold">Wishlist Details</h2>
      <p class="text-muted-foreground mt-2">
        Hier werden die Artikel einer spezifischen Wishlist angezeigt.
      </p>
    </div>

    <div class="text-muted-foreground py-12 text-center">
      <div class="space-y-2">
        <p>📝 Wishlist Items Placeholder</p>
        <p>Diese Ansicht zeigt die Artikel einer Wishlist an.</p>
        <p>Wishlist ID: {{ wishlistId }}</p>
        <p>Funktionalität wird später implementiert.</p>
        <Button
          @click="router.push('/tools/wishlists')"
          variant="outline"
          class="mt-4"
        >
          Zurück zur Übersicht
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
const route = useRoute()
const wishlistId = computed(() => route.params.id as string)
</script>
