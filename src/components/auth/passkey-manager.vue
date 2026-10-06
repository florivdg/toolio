<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { passkey, signOut } from '@/lib/auth-client'
import { signInRedirect } from '@/lib/auth-access'
import {
  SESSION_NOT_FRESH_CODE,
  SESSION_NOT_FRESH_MESSAGE,
} from '@/lib/auth-session'
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
import { Loader2, Plus, KeyRound, LogIn } from 'lucide-vue-next'
import PasskeyTable from './PasskeyTable.vue'
import type { Passkey } from '@/lib/passkeys'

const passkeys = ref<Passkey[]>([])
const isLoading = ref(false)
const isAddingPasskey = ref(false)
const passkeyName = ref('')
const error = ref('')
// Set when the server wants a recent sign-in before changing passkeys.
const needsReauth = ref(false)
const isSigningOut = ref(false)

function requireReauth() {
  needsReauth.value = true
  error.value = SESSION_NOT_FRESH_MESSAGE
}

/**
 * Signs out first: the middleware sends a signed-in visitor away from the
 * sign-in page, so going there directly would just land on the home page.
 */
async function reauthenticate() {
  isSigningOut.value = true
  try {
    const result = await signOut()
    if (result?.error) throw result.error

    window.location.href = signInRedirect('/account')
  } catch (err) {
    error.value = 'Abmelden fehlgeschlagen. Bitte versuchen Sie es erneut.'
    console.error('Error signing out for re-authentication:', err)
  } finally {
    isSigningOut.value = false
  }
}

async function loadPasskeys() {
  isLoading.value = true
  try {
    const response = await fetch('/api/auth/passkeys')
    if (!response.ok) {
      throw new Error('Failed to fetch passkeys')
    }
    const data = await response.json()
    passkeys.value = data.passkeys || []
    error.value = ''
  } catch (err) {
    error.value = 'Fehler beim Laden der Passkeys'
    console.error('Error loading passkeys:', err)
  } finally {
    isLoading.value = false
  }
}

async function addPasskey() {
  needsReauth.value = false
  if (!passkeyName.value.trim()) {
    error.value = 'Bitte geben Sie einen Namen für den Passkey ein'
    return
  }

  isAddingPasskey.value = true
  try {
    const result = await passkey.addPasskey({ name: passkeyName.value.trim() })

    // The client reports a rejected registration in the result rather than by
    // throwing, so both paths have to be handled.
    if (result?.error?.code === SESSION_NOT_FRESH_CODE) {
      requireReauth()
      return
    }
    if (result?.error) {
      error.value =
        result.error.message || 'Fehler beim Hinzufügen des Passkeys'
      return
    }

    passkeyName.value = ''
    await loadPasskeys()
    error.value = ''
  } catch (err) {
    error.value = 'Fehler beim Hinzufügen des Passkey'
    console.error('Error adding passkey:', err)
  } finally {
    isAddingPasskey.value = false
  }
}

async function deletePasskey(id: string) {
  if (!confirm('Sind Sie sicher, dass Sie diesen Passkey löschen möchten?')) {
    return
  }

  needsReauth.value = false
  try {
    const response = await fetch('/api/auth/passkeys', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })

    if (response.status === 403) {
      const data = await response.json().catch(() => null)
      if (data?.code === SESSION_NOT_FRESH_CODE) {
        requireReauth()
        return
      }
    }

    if (!response.ok) {
      throw new Error('Failed to delete passkey')
    }

    await loadPasskeys()
    error.value = ''
  } catch (err) {
    error.value = 'Fehler beim Löschen des Passkeys'
    console.error('Error deleting passkey:', err)
  }
}

onMounted(() => {
  loadPasskeys()
})
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <KeyRound class="h-5 w-5" />
        Passkeys
      </CardTitle>
      <CardDescription>
        Verwalten Sie Ihre Passkeys für eine sichere, passwortlose Anmeldung.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Add Passkey Form -->
      <div class="grid gap-2">
        <Label for="passkey-name">Neuen Passkey hinzufügen</Label>
        <div class="flex gap-2">
          <Input
            id="passkey-name"
            v-model="passkeyName"
            placeholder="z.B. Mein MacBook"
            :disabled="isAddingPasskey"
          />
          <Button
            @click="addPasskey"
            :disabled="isAddingPasskey || !passkeyName.trim()"
          >
            <Loader2 v-if="isAddingPasskey" class="mr-2 h-4 w-4 animate-spin" />
            <Plus v-else class="mr-2 h-4 w-4" />
            {{ isAddingPasskey ? 'Wird hinzugefügt...' : 'Hinzufügen' }}
          </Button>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600"
      >
        <span>{{ error }}</span>
        <Button
          v-if="needsReauth"
          size="sm"
          variant="outline"
          :disabled="isSigningOut"
          @click="reauthenticate"
        >
          <Loader2 v-if="isSigningOut" class="mr-2 h-4 w-4 animate-spin" />
          <LogIn v-else class="mr-2 h-4 w-4" />
          Erneut anmelden
        </Button>
      </div>

      <!-- Passkeys Table -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium">Ihre Passkeys</h3>

        <div v-if="isLoading" class="flex justify-center py-8">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>

        <div
          v-else-if="passkeys.length === 0"
          class="py-8 text-center text-gray-500"
        >
          <KeyRound class="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>Noch keine Passkeys hinzugefügt</p>
          <p class="text-sm">
            Fügen Sie Ihren ersten Passkey hinzu, um passwortlos anzumelden.
          </p>
        </div>

        <PasskeyTable v-else :passkeys="passkeys" @delete="deletePasskey" />
      </div>
    </CardContent>
  </Card>
</template>
