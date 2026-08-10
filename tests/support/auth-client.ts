import { mock } from 'bun:test'

/**
 * One better-auth client stub for every test file.
 *
 * `mock.module` is process-global, so a file stubbing only `signIn` and another
 * stubbing only `passkey` would each break the other's imports depending on
 * load order. This exposes the whole surface and lets tests steer it.
 */

type Callbacks = {
  onSuccess?: () => void
  onError?: (ctx: unknown) => void
}

/** What each call should do next. */
export const authBehaviour = {
  emailOutcome: 'success' as 'success' | 'error' | 'throw',
  /** Result of `signIn.passkey()`; an object with `error` means rejected. */
  passkeyResult: null as { error?: unknown } | null,
  passkeySignInThrows: false,
  /** Result of `passkey.addPasskey()`. */
  addPasskeyResult: null as { error?: { message?: string } } | null,
}

/** What each call was given, in order. */
export const authCalls = {
  email: [] as unknown[],
  passkeySignIn: [] as unknown[],
  addPasskey: [] as unknown[],
}

mock.module('@/lib/auth-client', () => ({
  signIn: {
    email: async (credentials: unknown, callbacks?: Callbacks) => {
      authCalls.email.push(credentials)

      if (authBehaviour.emailOutcome === 'throw') throw new Error('Netzwerk')
      if (authBehaviour.emailOutcome === 'error') callbacks?.onError?.({})
      else callbacks?.onSuccess?.()
    },
    passkey: async (...args: unknown[]) => {
      authCalls.passkeySignIn.push(args)

      if (authBehaviour.passkeySignInThrows) throw new Error('Abgebrochen')

      return authBehaviour.passkeyResult
    },
  },
  passkey: {
    addPasskey: async (args: unknown) => {
      authCalls.addPasskey.push(args)

      return authBehaviour.addPasskeyResult
    },
  },
}))

/** Back to "everything succeeds" with no recorded calls. */
export function resetAuthClient() {
  authBehaviour.emailOutcome = 'success'
  authBehaviour.passkeyResult = null
  authBehaviour.passkeySignInThrows = false
  authBehaviour.addPasskeyResult = null

  for (const calls of Object.values(authCalls)) calls.length = 0
}
