<template>
  <form @submit.prevent="$emit('submit')" class="space-y-4">
    <!-- Essential fields - always visible -->
    <div class="space-y-2">
      <Label :for="`${fieldPrefix}-name`">Name *</Label>
      <Input
        :id="`${fieldPrefix}-name`"
        v-model="formData.name"
        autocomplete="off"
        data-1p-ignore
        placeholder="z.B. Buch, Gadget, Kleidung..."
        required
      />
    </div>

    <div class="space-y-2">
      <Label :for="`${fieldPrefix}-url`">Link/URL *</Label>
      <div class="flex gap-2">
        <Input
          :id="`${fieldPrefix}-url`"
          v-model="formData.url"
          type="url"
          placeholder="https://example.com/artikel"
          required
          class="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          @click="extractUrlDetails"
          :disabled="!formData.url.trim() || isExtracting"
          title="Produktdetails automatisch extrahieren"
        >
          <Sparkles v-if="!isExtracting" class="h-4 w-4" />
          <Loader2 v-else class="h-4 w-4 animate-spin" />
        </Button>
      </div>
    </div>

    <!-- Collapsible section for optional fields -->
    <Collapsible v-model:open="showAdvancedFields">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          class="flex w-full items-center justify-between p-0 text-sm font-normal"
        >
          <span>{{
            showAdvancedFields ? 'Weniger Optionen' : 'Mehr Optionen'
          }}</span>
          <ChevronDown
            :class="[
              'h-4 w-4 transition-transform duration-200',
              showAdvancedFields && 'rotate-180',
            ]"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent class="space-y-4 pt-4">
        <div class="space-y-2">
          <Label :for="`${fieldPrefix}-description`"
            >Beschreibung (optional)</Label
          >
          <Textarea
            :id="`${fieldPrefix}-description`"
            v-model="formData.description"
            placeholder="Weitere Details zum Artikel..."
            rows="2"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label :for="`${fieldPrefix}-price`">Preis (optional)</Label>
            <Input
              :id="`${fieldPrefix}-price`"
              v-model="formData.price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div class="space-y-2">
            <Label :for="`${fieldPrefix}-priority`">Priorität</Label>
            <WishlistPrioritySelect v-model="formData.priority" />
          </div>
        </div>

        <div class="space-y-2">
          <Label :for="`${fieldPrefix}-imageUrl`">Bild-URL (optional)</Label>
          <Input
            :id="`${fieldPrefix}-imageUrl`"
            v-model="formData.imageUrl"
            type="url"
            placeholder="https://example.com/bild.jpg"
          />
        </div>

        <div class="space-y-2">
          <Label :for="`${fieldPrefix}-notes`">Notizen (optional)</Label>
          <Textarea
            :id="`${fieldPrefix}-notes`"
            v-model="formData.notes"
            placeholder="Persönliche Notizen zu diesem Artikel..."
            rows="2"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>

    <DialogFooter class="gap-2">
      <DialogClose asChild>
        <Button type="button" variant="outline"> Abbrechen </Button>
      </DialogClose>
      <Button type="submit" :disabled="!isFormValid || isSubmitting">
        <span v-if="isSubmitting">{{ submitLoadingText }}</span>
        <span v-else>{{ submitText }}</span>
      </Button>
    </DialogFooter>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Sparkles, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import WishlistPrioritySelect from './WishlistPrioritySelect.vue'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import {
  extractionMessage,
  hasOptionalDetails,
  mergeExtractedDetails,
} from '@/lib/wishlists/item-form'
import type {
  ExtractedDetails,
  WishlistItemFormData as FormData,
} from '@/lib/wishlists/item-form'

// Props
interface Props {
  formData: FormData
  isSubmitting: boolean
  submitText: string
  submitLoadingText: string
  fieldPrefix: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  submit: []
  'update:formData': [formData: FormData]
}>()

// State
const showAdvancedFields = ref(false)
const isExtracting = ref(false)

// Methods
async function extractUrlDetails() {
  if (!props.formData.url.trim()) {
    toast.error('Bitte geben Sie zuerst eine URL ein')
    return
  }

  isExtracting.value = true

  try {
    const response = await fetch('/api/wishlists/extract-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: props.formData.url,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Fehler beim Extrahieren der URL-Details')
    }

    const extractedData: ExtractedDetails = result.data

    emit(
      'update:formData',
      mergeExtractedDetails(props.formData, extractedData),
    )
    toast.success(extractionMessage(extractedData.confidence))

    // Automatically expand advanced fields if we extracted optional data
    if (hasOptionalDetails(extractedData)) {
      showAdvancedFields.value = true
    }
  } catch (error) {
    console.error('Error extracting URL details:', error)
    toast.error(
      error instanceof Error
        ? error.message
        : 'Fehler beim Extrahieren der URL-Details',
    )
  } finally {
    isExtracting.value = false
  }
}

// Computed
const isFormValid = computed(() => {
  return props.formData.name.trim() && props.formData.url.trim()
})
</script>
