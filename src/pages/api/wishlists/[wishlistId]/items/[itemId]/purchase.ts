import { createItemStatusRoute } from '@/lib/api/item-status-route'

// PATCH - Update purchase status of a wishlist item
export const PATCH = createItemStatusRoute({
  field: 'isPurchased',
  labelFor: (value) =>
    value ? 'Als gekauft markiert' : 'Als nicht gekauft markiert',
  log: 'Error updating purchase status',
  errorMessage: 'Fehler beim Aktualisieren des Kaufstatus',
})
