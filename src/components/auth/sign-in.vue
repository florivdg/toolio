<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const form = reactive({
  email: '',
  password: '',
})

// Store the redirect URL
const redirectUrl = ref('/')

// Add loading state
const isLoading = ref(false)

// Extract redirect URL from query parameters on component mount
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  if (redirect) {
    redirectUrl.value = redirect
  }
})

async function handleSubmit() {
  isLoading.value = true
  try {
    await signIn.email(
      {
        email: form.email,
        password: form.password,
      },
      {
        onSuccess: () => {
          // Redirect to the stored redirect URL or home page as fallback
          window.location.href = redirectUrl.value
        },
        onError: (error) => {
          console.error('Error:', error)
          isLoading.value = false
          // Handle error (e.g., show error message)
        },
      },
    )
  } catch (error) {
    console.error('Sign in failed:', error)
    isLoading.value = false
    // Handle sign-in error (e.g., show error message)
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl"> Anmelden </CardTitle>
      <CardDescription>
        Geben Sie Ihre E-Mail-Adresse ein, um sich anzumelden.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <form @submit.prevent="handleSubmit" class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            v-model="form.email"
            placeholder="m@beispiel.de"
            required
            :disabled="isLoading"
          />
        </div>
        <div class="grid gap-2">
          <Label for="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            v-model="form.password"
            required
            :disabled="isLoading"
          />
        </div>
        <Button type="submit" class="w-full" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ isLoading ? 'Bitte warten' : 'Anmelden' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
