import type { Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { WishlistItem } from '@/db/schema/wishlists'

/**
 * The shared shape and lifecycle of the wishlist item form.
 *
 * The create and edit modals differ only in which mutation they call and what
 * they emit; everything about the form itself — its fields, how they reset, and
 * how their strings become an API payload — was written out twice.
 */

/** Form state, held as strings because the inputs are text and number fields. */
export interface WishlistItemFormData {
  name: string
  description: string
  price: string
  url: string
  imageUrl: string
  priority: string
  notes: string
}

/** Priority defaults to the middle of the 1-5 range. */
const DEFAULT_PRIORITY = '3'

export function emptyItemFormData(): WishlistItemFormData {
  return {
    name: '',
    description: '',
    price: '',
    url: '',
    imageUrl: '',
    priority: DEFAULT_PRIORITY,
    notes: '',
  }
}

/** Clears a reactive form in place, keeping the object identity Vue tracks. */
export function resetItemFormData(formData: WishlistItemFormData): void {
  Object.assign(formData, emptyItemFormData())
}

/** Fills a reactive form in place from a stored item. */
export function populateItemFormData(
  formData: WishlistItemFormData,
  item: WishlistItem,
): void {
  Object.assign(formData, {
    name: item.name,
    description: item.description || '',
    price: item.price?.toString() || '',
    url: item.url,
    imageUrl: item.imageUrl || '',
    priority: (item.priority || Number(DEFAULT_PRIORITY)).toString(),
    notes: item.notes || '',
  })
}

/**
 * Convert form strings into the request body.
 *
 * Blank optional fields become `undefined` rather than empty strings so the API
 * treats them as absent instead of storing an empty value.
 */
export function toItemRequestData(formData: WishlistItemFormData) {
  return {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    price: formData.price ? parseFloat(formData.price) : undefined,
    url: formData.url.trim(),
    imageUrl: formData.imageUrl.trim() || undefined,
    priority: parseInt(formData.priority),
    notes: formData.notes.trim() || undefined,
  }
}

/** What the URL extractor endpoint returns for a product page. */
export interface ExtractedDetails {
  name?: string
  description?: string
  price?: number
  imageUrl?: string
  confidence: 'high' | 'medium' | 'low'
}

/** Which extracted fields live behind the "advanced" disclosure. */
const OPTIONAL_FIELDS = ['description', 'price', 'imageUrl'] as const

/** How confident the extractor was, phrased for the user. */
const CONFIDENCE_MESSAGES: Record<ExtractedDetails['confidence'], string> = {
  high: 'Produktdetails erfolgreich extrahiert! 🎉',
  medium: 'Einige Produktdetails gefunden. Bitte überprüfen Sie die Angaben.',
  low: 'Wenige Details gefunden. Bitte ergänzen Sie die fehlenden Informationen.',
}

export function extractionMessage(
  confidence: ExtractedDetails['confidence'],
): string {
  return CONFIDENCE_MESSAGES[confidence]
}

/** Whether anything was found that the advanced section should be opened for. */
export function hasOptionalDetails(details: ExtractedDetails): boolean {
  return OPTIONAL_FIELDS.some((field) => Boolean(details[field]))
}

/**
 * Merge extracted product details into the form.
 *
 * Only blank fields are filled: whatever the user already typed wins, since
 * extraction is a convenience and not a correction.
 */
export function mergeExtractedDetails(
  formData: WishlistItemFormData,
  details: ExtractedDetails,
): WishlistItemFormData {
  const merged = { ...formData }

  const candidates: [keyof WishlistItemFormData, string | undefined][] = [
    ['name', details.name],
    ['description', details.description],
    ['price', details.price?.toString()],
    ['imageUrl', details.imageUrl],
  ]

  for (const [field, value] of candidates) {
    if (value && !merged[field].trim()) merged[field] = value
  }

  return merged
}

/**
 * Run a form submission with the busy flag and error toast both modals need.
 *
 * @returns The action's result, or undefined when it failed
 */
export async function submitItemForm<T>(
  isSubmitting: Ref<boolean>,
  {
    action,
    log,
    fallbackMessage,
  }: {
    action: () => Promise<T>
    log: string
    fallbackMessage: string
  },
): Promise<T | undefined> {
  try {
    isSubmitting.value = true

    return await action()
  } catch (err) {
    console.error(`${log}:`, err)
    toast.error(err instanceof Error ? err.message : fallbackMessage)

    return undefined
  } finally {
    isSubmitting.value = false
  }
}
