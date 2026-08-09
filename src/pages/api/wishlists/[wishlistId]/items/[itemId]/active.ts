import { createItemStatusRoute } from '@/lib/api/item-status-route'

// PATCH - Update active status of a wishlist item
export const PATCH = createItemStatusRoute({
  field: 'isActive',
  labelFor: (value) => (value ? 'Als aktiv markiert' : 'Als inaktiv markiert'),
  log: 'Error updating active status',
  errorMessage: 'Fehler beim Aktualisieren des Aktivitätsstatus',
})
