import { captureNavigation } from '../support/dom'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * Covers the sign-in form's two paths and its redirect handling. The auth
 * client is stubbed: a real passkey sign-in needs an authenticator.
 */

import {
  authBehaviour as behaviour,
  authCalls,
  resetAuthClient,
} from '../support/auth-client'

const SignIn = (await import('@/components/auth/sign-in.vue')).default

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

let navigation: ReturnType<typeof captureNavigation>

/** Where the component tried to navigate, without actually navigating. */
const redirectedTo = () => navigation.target()

beforeEach(() => {
  resetAuthClient()
  navigation = captureNavigation({
    search: '',
    origin: 'http://localhost:4321',
  })
})

afterEach(() => {
  navigation.restore()
  document.body.innerHTML = ''
})

function fillCredentials(w: ReturnType<typeof mount>) {
  const inputs = w.findAll('input')

  return Promise.all([
    inputs[0]!.setValue('flori@example.com'),
    inputs[1]!.setValue('geheim'),
  ])
}

function submit(w: ReturnType<typeof mount>) {
  return w.find('form').trigger('submit')
}

describe('sign-in form', () => {
  test('renders the email and passkey options', () => {
    const w = mount(SignIn)

    expect(w.text()).toContain('Anmelden')
    expect(w.findAll('input')).toHaveLength(2)
  })

  test('signs in with the entered credentials', async () => {
    const w = mount(SignIn)

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(authCalls.email[0]).toEqual({
      email: 'flori@example.com',
      password: 'geheim',
    })
  })

  test('redirects home after a successful sign-in', async () => {
    const w = mount(SignIn)

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo()).toBe('/')
  })

  test('redirects to where the middleware sent the visitor from', async () => {
    window.location.search = '?redirect=%2Ftools%2Fwishlists'
    const w = mount(SignIn)
    await nextTick()

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo()).toBe('/tools/wishlists')
  })

  test('keeps the query and hash of a same-origin target', async () => {
    window.location.search = `?redirect=${encodeURIComponent(
      '/tools/wishlists?liste=1#neu',
    )}`
    const w = mount(SignIn)
    await nextTick()

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo()).toBe('/tools/wishlists?liste=1#neu')
  })

  test('lands at home instead of an off-site redirect target', async () => {
    window.location.search = `?redirect=${encodeURIComponent(
      'https://evil.example/phish',
    )}`
    const w = mount(SignIn)
    await nextTick()

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo()).toBe('/')
  })

  /** Same-origin as parsed, but the normalised path `//…` leaves the site. */
  test('lands at home for a dot-segment target that becomes off-site', async () => {
    window.location.search = `?redirect=${encodeURIComponent(
      '/safe/%2e%2e//attacker.invalid/path',
    )}`
    const w = mount(SignIn)
    await nextTick()

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo()).toBe('/')
  })

  test('reports wrong credentials without redirecting', async () => {
    behaviour.emailOutcome = 'error'
    const w = mount(SignIn)

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(w.text()).toContain('E-Mail oder Passwort falsch')
    expect(redirectedTo()).toBe('')
  })

  test('reports a failed request separately from wrong credentials', async () => {
    behaviour.emailOutcome = 'throw'
    const w = mount(SignIn)

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(w.text()).toContain('Anmeldung fehlgeschlagen')
  })
})

describe('sign-in with a passkey', () => {
  /** The passkey button is the one that is not the form's submit button. */
  function passkeyButton(w: ReturnType<typeof mount>) {
    return w.findAll('button').find((button) => /Passkey/.test(button.text()))!
  }

  test('redirects after a successful passkey sign-in', async () => {
    const w = mount(SignIn)

    await passkeyButton(w).trigger('click')
    await settle()

    expect(authCalls.passkeySignIn).toHaveLength(1)
    expect(redirectedTo()).toBe('/')
  })

  test('ignores a script redirect target after a passkey sign-in', async () => {
    window.location.search = '?redirect=javascript%3Aalert(1)'
    const w = mount(SignIn)
    await nextTick()

    await passkeyButton(w).trigger('click')
    await settle()

    expect(redirectedTo()).toBe('/')
  })

  test('ignores a same-origin URL with a // path after a passkey sign-in', async () => {
    window.location.search = `?redirect=${encodeURIComponent(
      'http://localhost:4321//attacker.invalid/path',
    )}`
    const w = mount(SignIn)
    await nextTick()

    await passkeyButton(w).trigger('click')
    await settle()

    expect(redirectedTo()).toBe('/')
  })

  test('ignores an off-site target after an autofill passkey sign-in', async () => {
    window.location.search = `?redirect=${encodeURIComponent(
      '/safe/..//attacker.invalid/path',
    )}`
    const original = window.PublicKeyCredential
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: { isConditionalMediationAvailable: async () => true },
    })

    try {
      mount(SignIn)
      await settle()

      // The autofill request is started on mount; the browser resolves it
      // whenever the user picks a passkey.
      const [, callbacks] = authCalls.passkeySignIn[0] as [
        unknown,
        { onSuccess: () => void },
      ]
      callbacks.onSuccess()

      expect(redirectedTo()).toBe('/')
    } finally {
      Object.defineProperty(window, 'PublicKeyCredential', {
        configurable: true,
        value: original,
      })
    }
  })

  test('reports a rejected passkey without redirecting', async () => {
    behaviour.passkeyResult = { error: { message: 'Abgebrochen' } }
    const w = mount(SignIn)

    await passkeyButton(w).trigger('click')
    await settle()

    expect(w.text()).toContain('Passkey-Anmeldung fehlgeschlagen')
    expect(redirectedTo()).toBe('')
  })

  test('reports a thrown passkey error', async () => {
    behaviour.passkeySignInThrows = true
    const w = mount(SignIn)

    await passkeyButton(w).trigger('click')
    await settle()

    expect(w.text()).toContain('Passkey-Anmeldung fehlgeschlagen')
  })
})
