<script setup lang="ts">
import { computed, reactive, onMounted, ref } from 'vue'
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
import { Loader2, KeyRound } from 'lucide-vue-next'

const form = reactive({
  email: '',
  password: '',
})

// Store the redirect URL
const redirectUrl = ref('/')

// Add loading states
const isLoading = ref(false)
const isPasskeyLoading = ref(false)
const error = ref('')

// Either sign-in method locks the whole form while it runs.
const busy = computed(() => isLoading.value || isPasskeyLoading.value)

// Extract redirect URL from query parameters on component mount
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  if (redirect) {
    redirectUrl.value = redirect
  }

  // Preload passkeys for conditional UI (autofill)
  if (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
      'function'
  ) {
    window.PublicKeyCredential.isConditionalMediationAvailable().then(
      (available) => {
        if (available) {
          // Preload passkeys for autofill
          signIn
            .passkey(
              { autoFill: true },
              {
                onSuccess: () => {
                  // Redirect after successful autofill sign-in
                  window.location.href = redirectUrl.value
                },
                onError: () => {
                  // Silently fail if no passkeys are available or user cancels
                },
              },
            )
            .catch(() => {
              // Additional catch for any other errors
            })
        }
      },
    )
  }
})

async function handleSubmit() {
  isLoading.value = true
  error.value = ''
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
        onError: (errorCtx) => {
          console.error('Error:', errorCtx)
          isLoading.value = false
          error.value = 'E-Mail oder Passwort falsch'
        },
      },
    )
  } catch (errorCtx) {
    console.error('Sign in failed:', errorCtx)
    isLoading.value = false
    error.value = 'Anmeldung fehlgeschlagen'
  }
}

async function handlePasskeySignIn() {
  isPasskeyLoading.value = true
  error.value = ''
  try {
    const result = await signIn.passkey()

    // Check if there's an error in the result
    if (result && result.error) {
      console.error('Passkey error:', result.error)
      error.value = 'Passkey-Anmeldung fehlgeschlagen'
      return
    }

    // If we get here, sign-in was successful - redirect
    window.location.href = redirectUrl.value
  } catch (err) {
    console.error('Passkey sign in failed:', err)
    error.value = 'Passkey-Anmeldung fehlgeschlagen'
  } finally {
    isPasskeyLoading.value = false
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl"> Anmelden </CardTitle>
      <CardDescription>
        Geben Sie Ihre E-Mail-Adresse ein oder verwenden Sie einen Passkey.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <!-- Error Message -->
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">
        {{ error }}
      </div>

      <!-- Passkey Sign In -->
      <Button
        @click="handlePasskeySignIn"
        variant="outline"
        class="w-full"
        :disabled="busy"
      >
        <Loader2 v-if="isPasskeyLoading" class="mr-2 h-4 w-4 animate-spin" />
        <KeyRound v-else class="mr-2 h-4 w-4" />
        {{ isPasskeyLoading ? 'Bitte warten...' : 'Mit Passkey anmelden' }}
      </Button>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background text-muted-foreground px-2">
            Oder mit E-Mail
          </span>
        </div>
      </div>

      <!-- Email/Password Form -->
      <form @submit.prevent="handleSubmit" class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            v-model="form.email"
            placeholder="m@beispiel.de"
            autocomplete="webauthn"
            required
            :disabled="busy"
          />
        </div>
        <div class="grid gap-2">
          <Label for="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            v-model="form.password"
            autocomplete="current-password webauthn"
            required
            :disabled="busy"
          />
        </div>
        <Button type="submit" class="w-full" :disabled="busy">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ isLoading ? 'Bitte warten...' : 'Anmelden' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
