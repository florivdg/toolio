import { mock } from 'bun:test'

/**
 * One vue-sonner stub for every test file.
 *
 * `mock.module` is process-global, so two files registering different shapes
 * would clobber each other depending on load order. Components call `toast(...)`
 * directly as well as `toast.success(...)`, so the stub has to be both.
 */

const toastCalls: { variant: string; args: unknown[] }[] = []

function record(variant: string) {
  return (...args: unknown[]) => {
    toastCalls.push({ variant, args })
  }
}

const toast = Object.assign(mock(record('default')), {
  success: mock(record('success')),
  error: mock(record('error')),
  warning: mock(record('warning')),
  info: mock(record('info')),
})

mock.module('vue-sonner', () => ({ toast, Toaster: { render: () => null } }))

/** Forget everything recorded so far; call this in beforeEach. */
export function resetToasts() {
  toastCalls.length = 0
}

/** The messages passed to toast, as a single searchable string. */
export function toastText() {
  return JSON.stringify(toastCalls)
}
