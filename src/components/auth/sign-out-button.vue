<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client'

async function handleSignOut() {
  await signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = '/sign-in' // redirect to login page
      },
    },
  })
}
</script>

<template>
  <Button @click="handleSignOut">Abmelden</Button>
</template>
