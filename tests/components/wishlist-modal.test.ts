import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetToasts, toastText } from '../support/toast'
import { mutationCalls, resetQueries, rejectNext } from '../support/queries'

/**
 * One component serves both create and edit. These cover which mutation each
 * mode calls and how a rejected mutation is reported, since the two modes share
 * a single submit path and differ only in computed strings.
 *
 * The component is imported dynamically so the query stub above is registered
 * before its module graph loads.
 */

const WishlistModal = (await import('@/components/wishlists/WishlistModal.vue'))
  .default

const wishlist = {
  id: 'w1',
  name: 'Umzug',
  description: 'Ideen',
} as never

async function mountModal(props: Record<string, unknown>) {
  const wrapper = mount(WishlistModal, {
    props: { modelValue: true, showTrigger: false, ...props } as never,
    attachTo: document.body,
  })
  await nextTick()

  return wrapper
}

/** The dialog renders into a portal, so its fields live on document.body. */
function field(id: string) {
  return document.querySelector<HTMLInputElement>(`#${id}`)!
}

function setField(id: string, value: string) {
  const element = field(id)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Submits the form rather than clicking the button: the button is disabled
 * while the name is blank, but the form can still be submitted with Enter,
 * which is the path handleSubmit's own guards exist for.
 */
function submitForm() {
  document
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  resetQueries()
  resetToasts()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WishlistModal in create mode', () => {
  test('shows the create wording', async () => {
    await mountModal({ mode: 'create' })

    expect(document.body.textContent).toContain('Neue Wishlist erstellen')
  })

  test('refuses to submit without a name', async () => {
    await mountModal({ mode: 'create' })

    submitForm()
    await settle()

    expect(mutationCalls.createWishlist).toHaveLength(0)
    expect(toastText()).toContain('Bitte geben Sie einen Namen ein.')
  })

  test('creates a wishlist from the trimmed form', async () => {
    const w = await mountModal({ mode: 'create' })

    setField('name', '  Umzug  ')
    setField('description', '  Ideen  ')
    await nextTick()
    submitForm()
    await settle()

    expect(mutationCalls.createWishlist[0]).toEqual({
      name: 'Umzug',
      description: 'Ideen',
    })
    expect(w.emitted('success')).toHaveLength(1)
    expect(toastText()).toContain('Wishlist erfolgreich erstellt!')
  })

  test('sends a blank description as absent', async () => {
    await mountModal({ mode: 'create' })

    setField('name', 'Umzug')
    await nextTick()
    submitForm()
    await settle()

    expect(mutationCalls.createWishlist[0]).toEqual({
      name: 'Umzug',
      description: undefined,
    })
  })

  test('reports a rejected mutation and stays open', async () => {
    const w = await mountModal({ mode: 'create' })
    rejectNext('createWishlist', new Error('Serverfehler'))

    setField('name', 'Umzug')
    await nextTick()
    submitForm()
    await settle()

    expect(toastText()).toContain('Serverfehler')
    expect(w.emitted('success')).toBeUndefined()
  })
})

describe('WishlistModal in edit mode', () => {
  test('shows the edit wording', async () => {
    await mountModal({ mode: 'edit', wishlist })

    expect(document.body.textContent).toContain('Wishlist bearbeiten')
  })

  test('prefills the form from the wishlist', async () => {
    await mountModal({ mode: 'edit', wishlist })

    expect(field('edit-name').value).toBe('Umzug')
    expect(field('edit-description').value).toBe('Ideen')
  })

  test('updates the wishlist by id', async () => {
    const w = await mountModal({ mode: 'edit', wishlist })

    setField('edit-name', 'Umzug 2024')
    await nextTick()
    submitForm()
    await settle()

    expect(mutationCalls.updateWishlist[0]).toEqual({
      id: 'w1',
      data: { name: 'Umzug 2024', description: 'Ideen' },
    })
    expect(w.emitted('success')).toHaveLength(1)
    expect(toastText()).toContain('Wishlist erfolgreich aktualisiert!')
  })

  test('does nothing without a wishlist to edit', async () => {
    await mountModal({ mode: 'edit' })

    setField('edit-name', 'Egal')
    await nextTick()
    submitForm()
    await settle()

    expect(mutationCalls.updateWishlist).toHaveLength(0)
  })

  test('reports a rejected update', async () => {
    await mountModal({ mode: 'edit', wishlist })
    rejectNext('updateWishlist', new Error('Konflikt'))

    setField('edit-name', 'Umzug 2024')
    await nextTick()
    submitForm()
    await settle()

    expect(toastText()).toContain('Konflikt')
  })
})
