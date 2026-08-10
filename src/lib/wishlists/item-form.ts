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
