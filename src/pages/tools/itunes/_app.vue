<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Toaster />
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
    <nav data-allow-mismatch class="flex grow-0 flex-col gap-2">
      <router-link
        to="/tools/itunes/search"
        custom
        v-slot="{ isActive, href, navigate }"
      >
        <Button
          asChild
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          <a :href="href"> Suchen </a>
        </Button>
      </router-link>
      <router-link
        to="/tools/itunes/watchlist"
        custom
        v-slot="{ isActive, href, navigate }"
      >
        <Button
          asChild
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          <a :href="href"> Watchlist </a>
        </Button>
      </router-link>
    </nav>
    <div>
      <router-view />
    </div>
  </div>
</template>
