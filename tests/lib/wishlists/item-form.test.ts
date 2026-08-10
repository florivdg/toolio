import { describe, expect, mock, test } from 'bun:test'
import { ref } from 'vue'
import type { WishlistItem } from '@/db/schema/wishlists'

const toastError = mock(() => {})
mock.module('vue-sonner', () => ({ toast: { error: toastError } }))

const {
  emptyItemFormData,
  populateItemFormData,
  resetItemFormData,
  submitItemForm,
  toItemRequestData,
} = await import('@/lib/wishlists/item-form')

/**
 * The create and edit modals share this form logic. The mapping below is what
 * decides whether a blank optional field reaches the API as an empty string or
 * as absent, which the API treats very differently.
 */

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'item-1',
    wishlistId: 'list-1',
    name: 'Kaffeemühle',
    url: 'https://example.com/p/1',
    ...overrides,
  } as WishlistItem
}

describe('emptyItemFormData', () => {
  test('starts blank with a mid-range priority', () => {
    expect(emptyItemFormData()).toEqual({
      name: '',
      description: '',
      price: '',
      url: '',
      imageUrl: '',
      priority: '3',
      notes: '',
    })
  })

  test('hands out a fresh object each time', () => {
    const first = emptyItemFormData()
    first.name = 'geändert'

    expect(emptyItemFormData().name).toBe('')
  })
})

describe('resetItemFormData', () => {
  test('clears every field in place', () => {
    const formData = emptyItemFormData()
    Object.assign(formData, { name: 'Etwas', price: '9.99', priority: '5' })

    resetItemFormData(formData)

    expect(formData).toEqual(emptyItemFormData())
  })

  test('keeps the same object so Vue reactivity survives', () => {
    const formData = emptyItemFormData()
    const before = formData

    resetItemFormData(formData)

    expect(formData).toBe(before)
  })
})

describe('populateItemFormData', () => {
  test('copies an item onto the form as strings', () => {
    const formData = emptyItemFormData()

    populateItemFormData(
      formData,
      item({
        description: 'Beschreibung',
        price: 89.9,
        imageUrl: 'https://example.com/a.jpg',
        priority: 5,
        notes: 'Notiz',
      }),
    )

    expect(formData).toEqual({
      name: 'Kaffeemühle',
      description: 'Beschreibung',
      price: '89.9',
      url: 'https://example.com/p/1',
      imageUrl: 'https://example.com/a.jpg',
      priority: '5',
      notes: 'Notiz',
    })
  })

  test('turns absent optional fields into empty strings', () => {
    const formData = emptyItemFormData()

    populateItemFormData(formData, item({ description: null, notes: null }))

    expect(formData.description).toBe('')
    expect(formData.notes).toBe('')
  })

  test('falls back to the default priority when the item has none', () => {
    const formData = emptyItemFormData()

    populateItemFormData(formData, item({ priority: null }))

    expect(formData.priority).toBe('3')
  })

  test('keeps a zero price rather than treating it as missing', () => {
    const formData = emptyItemFormData()

    populateItemFormData(formData, item({ price: 0 }))

    expect(formData.price).toBe('0')
  })

  test('leaves the price blank when the item has none', () => {
    const formData = emptyItemFormData()

    populateItemFormData(formData, item({ price: null }))

    expect(formData.price).toBe('')
  })
})

describe('toItemRequestData', () => {
  test('trims the required fields', () => {
    const formData = emptyItemFormData()
    Object.assign(formData, {
      name: '  Kaffeemühle  ',
      url: '  https://example.com/p/1  ',
    })

    expect(toItemRequestData(formData)).toMatchObject({
      name: 'Kaffeemühle',
      url: 'https://example.com/p/1',
    })
  })

  test('sends blank optional fields as undefined, not empty strings', () => {
    const request = toItemRequestData(emptyItemFormData())

    expect(request.description).toBeUndefined()
    expect(request.imageUrl).toBeUndefined()
    expect(request.notes).toBeUndefined()
    expect(request.price).toBeUndefined()
  })

  test('treats whitespace-only optional fields as blank', () => {
    const formData = emptyItemFormData()
    Object.assign(formData, { description: '   ', notes: '\t' })

    const request = toItemRequestData(formData)

    expect(request.description).toBeUndefined()
    expect(request.notes).toBeUndefined()
  })

  test('parses the numeric fields', () => {
    const formData = emptyItemFormData()
    Object.assign(formData, { price: '89,90'.replace(',', '.'), priority: '5' })

    const request = toItemRequestData(formData)

    expect(request.price).toBe(89.9)
    expect(request.priority).toBe(5)
  })
})

describe('submitItemForm', () => {
  test('returns the action result and clears the busy flag', async () => {
    const isSubmitting = ref(false)

    const result = await submitItemForm(isSubmitting, {
      action: async () => ({ id: 'item-1' }),
      log: 'irrelevant',
      fallbackMessage: 'Fehler',
    })

    expect(result).toEqual({ id: 'item-1' })
    expect(isSubmitting.value).toBe(false)
  })

  test('marks the form busy while the action runs', async () => {
    const isSubmitting = ref(false)
    let observed = false

    await submitItemForm(isSubmitting, {
      action: async () => {
        observed = isSubmitting.value
        return null
      },
      log: 'irrelevant',
      fallbackMessage: 'Fehler',
    })

    expect(observed).toBe(true)
  })

  test('reports a failure as undefined and toasts the error message', async () => {
    toastError.mockClear()
    const isSubmitting = ref(false)

    const result = await submitItemForm(isSubmitting, {
      action: async () => {
        throw new Error('Serverfehler')
      },
      log: 'irrelevant',
      fallbackMessage: 'Fehler beim Speichern',
    })

    expect(result).toBeUndefined()
    expect(isSubmitting.value).toBe(false)
    expect(toastError).toHaveBeenCalledWith('Serverfehler')
  })

  test('falls back to the given message for a non-Error throw', async () => {
    toastError.mockClear()

    await submitItemForm(ref(false), {
      action: async () => {
        throw 'kaputt'
      },
      log: 'irrelevant',
      fallbackMessage: 'Fehler beim Speichern',
    })

    expect(toastError).toHaveBeenCalledWith('Fehler beim Speichern')
  })
})
