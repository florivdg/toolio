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
      <Input
        :id="`${fieldPrefix}-url`"
        v-model="formData.url"
        type="url"
        placeholder="https://example.com/artikel"
        required
      />
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
            <Select v-model="formData.priority">
              <SelectTrigger>
                <SelectValue placeholder="Wählen Sie..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  <div class="flex items-center gap-2">
                    <Star class="h-4 w-4" />
                    Niedrig (1)
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div class="flex items-center gap-2">
                    <div class="flex">
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                    </div>
                    Mittel-niedrig (2)
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div class="flex items-center gap-2">
                    <div class="flex">
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                    </div>
                    Mittel (3)
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div class="flex items-center gap-2">
                    <div class="flex">
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                    </div>
                    Hoch (4)
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div class="flex items-center gap-2">
                    <div class="flex">
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                      <Star class="h-4 w-4" />
                    </div>
                    Sehr hoch (5)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
import { Star, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// Types
interface FormData {
  name: string
  description: string
  price: string
  url: string
  imageUrl: string
  priority: string
  notes: string
}

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
defineEmits<{
  submit: []
}>()

// State
const showAdvancedFields = ref(false)

// Computed
const isFormValid = computed(() => {
  return props.formData.name.trim() && props.formData.url.trim()
})
</script>
