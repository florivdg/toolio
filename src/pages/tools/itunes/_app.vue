<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="grid grid-cols-[auto_1fr] gap-4">
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
