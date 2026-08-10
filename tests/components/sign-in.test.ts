import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
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

/** Where the component tried to navigate, without actually navigating. */
let redirectedTo = ''

beforeEach(() => {
  resetAuthClient()
  redirectedTo = ''

  // happy-dom would try to load the target; capture the assignment instead.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      search: '',
      set href(value: string) {
        redirectedTo = value
      },
      get href() {
        return redirectedTo
      },
    },
  })
})

afterEach(() => {
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

    expect(redirectedTo).toBe('/')
  })

  test('redirects to where the middleware sent the visitor from', async () => {
    window.location.search = '?redirect=%2Ftools%2Fwishlists'
    const w = mount(SignIn)
    await nextTick()

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(redirectedTo).toBe('/tools/wishlists')
  })

  test('reports wrong credentials without redirecting', async () => {
    behaviour.emailOutcome = 'error'
    const w = mount(SignIn)

    await fillCredentials(w)
    await submit(w)
    await settle()

    expect(w.text()).toContain('E-Mail oder Passwort falsch')
    expect(redirectedTo).toBe('')
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
    expect(redirectedTo).toBe('/')
  })

  test('reports a rejected passkey without redirecting', async () => {
    behaviour.passkeyResult = { error: { message: 'Abgebrochen' } }
    const w = mount(SignIn)

    await passkeyButton(w).trigger('click')
    await settle()

    expect(w.text()).toContain('Passkey-Anmeldung fehlgeschlagen')
    expect(redirectedTo).toBe('')
  })

  test('reports a thrown passkey error', async () => {
    behaviour.passkeySignInThrows = true
    const w = mount(SignIn)

    await passkeyButton(w).trigger('click')
    await settle()

    expect(w.text()).toContain('Passkey-Anmeldung fehlgeschlagen')
  })
})
