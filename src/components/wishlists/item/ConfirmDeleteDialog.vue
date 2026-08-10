<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Destructive confirmation prompt. The item and wishlist deletions differ only
 * in their wording, so both drive this one dialog.
 */
defineProps<{
  title: string
  description: string
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { required: true })

defineEmits<{ confirm: [] }>()
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
        <AlertDialogAction
          @click="$emit('confirm')"
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="loading"
        >
          <span v-if="loading">Löscht...</span>
          <span v-else>Löschen</span>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
