import { captureNavigation } from '../support/dom'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { formatPasskeyDate, getDeviceTypeLabel } from '@/lib/passkeys'
import type { Passkey } from '@/lib/passkeys'

/**
 * Covers the passkey manager's load, add and delete paths. The WebAuthn client
 * is stubbed — a real registration needs an authenticator — and the API goes
 * through a stubbed `fetch`.
 */

import {
  authBehaviour,
  authCalls,
  resetAuthClient,
} from '../support/auth-client'

const PasskeyManager = (await import('@/components/auth/passkey-manager.vue'))
  .default
const PasskeyTable = (await import('@/components/auth/PasskeyTable.vue'))
  .default

let originalFetch: typeof globalThis.fetch
let originalConfirm: typeof globalThis.confirm
let requests: { url: string; method: string; body: any }[] = []
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function aPasskey(overrides: Partial<Passkey> = {}): Passkey {
  return {
    id: 'pk-1',
    name: 'MacBook',
    deviceType: 'singleDevice',
    backedUp: true,
    createdAt: '2024-03-01T10:30:00Z',
    ...overrides,
  }
}

/** Answers the passkeys endpoint with the given list, or fails the request. */
function stubApi(passkeys: Passkey[] | 'error') {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: input.toString(),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })

    if (passkeys === 'error') return new Response('no', { status: 500 })

    return Response.json({ passkeys })
  }) as unknown as typeof fetch
}

async function mountManager(passkeys: Passkey[] | 'error' = []) {
  stubApi(passkeys)
  const wrapper = mount(PasskeyManager)
  await settle()

  return wrapper
}

beforeEach(() => {
  originalFetch = globalThis.fetch
  originalConfirm = globalThis.confirm
  globalThis.confirm = () => true
  requests = []
  resetAuthClient()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.confirm = originalConfirm
  document.body.innerHTML = ''
})

describe('passkey helpers', () => {
  test('translates the WebAuthn device types', () => {
    expect(getDeviceTypeLabel('singleDevice')).toBe('Einzelgerät')
    expect(getDeviceTypeLabel('multiDevice')).toBe('Mehrere Geräte')
  })

  test('shows an unknown device type verbatim', () => {
    expect(getDeviceTypeLabel('futureDevice')).toBe('futureDevice')
  })

  test('formats a creation date for the German locale', () => {
    // Day-first ordering is the point; the exact separators are the locale's.
    expect(formatPasskeyDate('2024-03-01T10:30:00Z')).toMatch(/^01\.03\.2024/)
  })
})

describe('PasskeyTable', () => {
  test('renders a row per passkey', () => {
    const w = mount(PasskeyTable, {
      props: { passkeys: [aPasskey(), aPasskey({ id: 'pk-2' })] },
    })

    expect(w.findAll('tbody tr')).toHaveLength(2)
  })

  test('names an unnamed passkey', () => {
    const w = mount(PasskeyTable, {
      props: { passkeys: [aPasskey({ name: null })] },
    })

    expect(w.text()).toContain('Unbenannt')
  })

  test('marks backed-up state in words and colour', () => {
    const backedUp = mount(PasskeyTable, {
      props: { passkeys: [aPasskey({ backedUp: true })] },
    })
    const local = mount(PasskeyTable, {
      props: { passkeys: [aPasskey({ backedUp: false })] },
    })

    expect(backedUp.text()).toContain('Ja')
    expect(backedUp.find('.text-green-600').exists()).toBe(true)
    expect(local.text()).toContain('Nein')
    expect(local.find('.text-orange-600').exists()).toBe(true)
  })

  test('emits delete with the row id', async () => {
    const w = mount(PasskeyTable, { props: { passkeys: [aPasskey()] } })

    await w.find('tbody button').trigger('click')

    expect(w.emitted('delete')?.[0]).toEqual(['pk-1'])
  })
})

describe('passkey manager', () => {
  test('lists the passkeys it loaded', async () => {
    const w = await mountManager([aPasskey()])

    expect(w.findComponent(PasskeyTable).exists()).toBe(true)
    expect(w.text()).toContain('MacBook')
  })

  test('invites a first passkey when there are none', async () => {
    const w = await mountManager([])

    expect(w.text()).toContain('Noch keine Passkeys hinzugefügt')
    expect(w.findComponent(PasskeyTable).exists()).toBe(false)
  })

  test('reports a failed load', async () => {
    const w = await mountManager('error')

    expect(w.text()).toContain('Fehler beim Laden der Passkeys')
  })

  test('refuses to add a passkey without a name', async () => {
    const w = await mountManager([])

    // The button is disabled, so drive the handler the way a submit would.
    await w.findAll('button')[0]!.trigger('click')
    await settle()

    expect(authCalls.addPasskey).toHaveLength(0)
  })

  test('registers a named passkey and reloads the list', async () => {
    const w = await mountManager([])

    await w.find('input').setValue('  Mein MacBook  ')
    await w.findAll('button')[0]!.trigger('click')
    await settle()

    expect(authCalls.addPasskey[0]).toEqual({ name: 'Mein MacBook' })
    // Two GETs: the initial load and the reload after registering.
    expect(requests.filter((r) => r.method === 'GET')).toHaveLength(2)
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
  })

  /** The client reports a rejected registration in its result, not by throwing. */
  test('surfaces a rejected registration', async () => {
    const w = await mountManager([])
    authBehaviour.addPasskeyResult = { error: { message: 'Abgebrochen' } }

    await w.find('input').setValue('Mein MacBook')
    await w.findAll('button')[0]!.trigger('click')
    await settle()

    expect(w.text()).toContain('Abgebrochen')
    // The name stays so the user can retry without retyping it.
    expect((w.find('input').element as HTMLInputElement).value).toBe(
      'Mein MacBook',
    )
  })

  test('falls back to a generic message for an error with no message', async () => {
    const w = await mountManager([])
    authBehaviour.addPasskeyResult = { error: {} }

    await w.find('input').setValue('Mein MacBook')
    await w.findAll('button')[0]!.trigger('click')
    await settle()

    expect(w.text()).toContain('Fehler beim Hinzufügen des Passkeys')
  })

  test('deletes a passkey after confirmation', async () => {
    const w = await mountManager([aPasskey()])

    w.findComponent({ name: 'PasskeyTable' }).vm.$emit('delete', 'pk-1')
    await settle()

    const deleted = requests.find((r) => r.method === 'DELETE')!
    expect(deleted.body).toEqual({ id: 'pk-1' })
  })

  test('does nothing when the confirmation is declined', async () => {
    const w = await mountManager([aPasskey()])
    globalThis.confirm = () => false

    w.findComponent({ name: 'PasskeyTable' }).vm.$emit('delete', 'pk-1')
    await settle()

    expect(requests.some((r) => r.method === 'DELETE')).toBe(false)
  })

  test('reports a failed delete', async () => {
    const w = await mountManager([aPasskey()])
    stubApi('error')

    w.findComponent({ name: 'PasskeyTable' }).vm.$emit('delete', 'pk-1')
    await settle()

    expect(w.text()).toContain('Fehler beim Löschen des Passkeys')
    expect(reauthButton(w)).toBeUndefined()
  })
})

function reauthButton(w: ReturnType<typeof mount>) {
  return w.findAll('button').find((b) => b.text().includes('Erneut anmelden'))
}

/**
 * Changing passkeys needs a recent sign-in. The server answers a stale session
 * with `SESSION_NOT_FRESH`, and the only way back to a fresh one is signing out
 * first: the middleware sends signed-in visitors away from the sign-in page.
 */
describe('passkey manager with a stale session', () => {
  const STALE_MESSAGE =
    'Bitte melden Sie sich erneut an, um Ihre Passkeys zu ändern.'

  let navigation: ReturnType<typeof captureNavigation>
  const navigatedTo = () => navigation.target()

  beforeEach(() => {
    navigation = captureNavigation()
  })

  afterEach(() => {
    navigation.restore()
  })

  /** Answers the list as usual and a delete with the stale-session 403. */
  function stubStaleDelete() {
    const list = globalThis.fetch
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      if (init?.method !== 'DELETE') return list(input, init)

      requests.push({ url: input.toString(), method: 'DELETE', body: null })

      return Response.json(
        { error: STALE_MESSAGE, code: 'SESSION_NOT_FRESH' },
        { status: 403 },
      )
    }) as unknown as typeof fetch
  }

  async function addWithStaleSession() {
    const w = await mountManager([])
    authBehaviour.addPasskeyResult = {
      error: { code: 'SESSION_NOT_FRESH', message: 'Session is not fresh' },
    }

    await w.find('input').setValue('Mein MacBook')
    await w.findAll('button')[0]!.trigger('click')
    await settle()

    return w
  }

  test('asks for a new sign-in instead of showing the library message', async () => {
    const w = await addWithStaleSession()

    expect(w.text()).toContain(STALE_MESSAGE)
    expect(w.text()).not.toContain('Session is not fresh')
    expect(reauthButton(w)).toBeDefined()
    // The name stays, and the add button is usable again.
    expect((w.find('input').element as HTMLInputElement).value).toBe(
      'Mein MacBook',
    )
    expect(w.text()).not.toContain('Wird hinzugefügt...')
  })

  test('asks for a new sign-in when a delete is refused', async () => {
    const w = await mountManager([aPasskey()])
    stubStaleDelete()

    w.findComponent({ name: 'PasskeyTable' }).vm.$emit('delete', 'pk-1')
    await settle()

    expect(w.text()).toContain(STALE_MESSAGE)
    expect(w.text()).not.toContain('Fehler beim Löschen des Passkeys')
    expect(reauthButton(w)).toBeDefined()
    // Still listed: the delete did not happen.
    expect(w.text()).toContain('MacBook')
  })

  test('signs out, then goes to sign-in and back to the account page', async () => {
    const w = await addWithStaleSession()

    await reauthButton(w)!.trigger('click')
    await settle()

    expect(authCalls.signOut).toHaveLength(1)
    expect(navigatedTo()).toBe('/sign-in?redirect=%2Faccount')
  })

  test('stays put and says so when signing out is rejected', async () => {
    authBehaviour.signOutResult = { error: { status: 500 } }
    const w = await addWithStaleSession()

    await reauthButton(w)!.trigger('click')
    await settle()

    expect(navigatedTo()).toBe('')
    expect(w.text()).toContain('Abmelden fehlgeschlagen')
    // Still offered, so the user can try again.
    expect(reauthButton(w)!.attributes('disabled')).toBeUndefined()
  })

  test('stays put and says so when signing out throws', async () => {
    authBehaviour.signOutThrows = true
    const w = await addWithStaleSession()

    await reauthButton(w)!.trigger('click')
    await settle()

    expect(navigatedTo()).toBe('')
    expect(w.text()).toContain('Abmelden fehlgeschlagen')
  })

  test('drops the prompt once a later action fails for another reason', async () => {
    const w = await addWithStaleSession()
    authBehaviour.addPasskeyResult = { error: { message: 'Abgebrochen' } }

    await w.findAll('button')[0]!.trigger('click')
    await settle()

    expect(w.text()).toContain('Abgebrochen')
    expect(reauthButton(w)).toBeUndefined()
  })
})
