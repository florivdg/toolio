<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <section>
    <div class="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
      <h2
        class="text-foreground max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
      >
        Einfach Machen, den Rest erledigen die Tools.
      </h2>
      <div class="mt-10 flex items-center gap-x-6">
        <Button as-child>
          <a href="/tools">Tools</a>
        </Button>

        <Button as-child variant="ghost">
          <a href="/docs">Dokumentation <span aria-hidden="true">→</span></a>
        </Button>
      </div>
    </div>
  </section>
</template>
