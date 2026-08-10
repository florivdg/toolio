<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { passkey } from '@/lib/auth-client'
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
import { Loader2, Plus, KeyRound } from 'lucide-vue-next'
import PasskeyTable from './PasskeyTable.vue'
import type { Passkey } from '@/lib/passkeys'

const passkeys = ref<Passkey[]>([])
const isLoading = ref(false)
const isAddingPasskey = ref(false)
const passkeyName = ref('')
const error = ref('')

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
  if (!passkeyName.value.trim()) {
    error.value = 'Bitte geben Sie einen Namen für den Passkey ein'
    return
  }

  isAddingPasskey.value = true
  try {
    const result = await passkey.addPasskey({ name: passkeyName.value.trim() })

    // The client reports a rejected registration in the result rather than by
    // throwing, so both paths have to be handled.
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

  try {
    const response = await fetch('/api/auth/passkeys', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })

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
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">
        {{ error }}
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
