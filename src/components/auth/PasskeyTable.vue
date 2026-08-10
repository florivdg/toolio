<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Gerätetyp</TableHead>
        <TableHead>Gesichert</TableHead>
        <TableHead>Erstellt am</TableHead>
        <TableHead class="w-16">Aktionen</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="entry in passkeys" :key="entry.id">
        <TableCell class="font-medium">
          {{ entry.name || 'Unbenannt' }}
        </TableCell>
        <TableCell>{{ getDeviceTypeLabel(entry.deviceType) }}</TableCell>
        <TableCell>
          <span :class="entry.backedUp ? 'text-green-600' : 'text-orange-600'">
            {{ entry.backedUp ? 'Ja' : 'Nein' }}
          </span>
        </TableCell>
        <TableCell>{{ formatPasskeyDate(entry.createdAt) }}</TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            class="text-red-600 hover:text-red-700"
            @click="emit('delete', entry.id)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatPasskeyDate, getDeviceTypeLabel } from '@/lib/passkeys'
import type { Passkey } from '@/lib/passkeys'

/** The registered passkeys, one row each. */
defineProps<{ passkeys: Passkey[] }>()

const emit = defineEmits<{ delete: [id: string] }>()
</script>
