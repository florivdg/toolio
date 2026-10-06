import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Registers a DOM so @vue/test-utils can mount components. Imported by the
 * component tests rather than the global preload, so the API tests keep running
 * without a document.
 */
if (!globalThis.document) {
  // A concrete URL is required: components build request URLs against
  // window.location.origin, and happy-dom's default about:blank has none.
  GlobalRegistrator.register({ url: 'http://localhost/' })
}

/**
 * Swaps `window.location` for a stand-in that records `href` assignments
 * instead of navigating, which happy-dom would try to do for real. Any other
 * fields, like `search` or `origin`, are passed in. Call `restore` afterwards.
 */
export function captureNavigation(fields: Record<string, string> = {}) {
  const original = Object.getOwnPropertyDescriptor(window, 'location')
  let target = ''

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...fields,
      set href(value: string) {
        target = value
      },
      get href() {
        return target
      },
    },
  })

  return {
    /** Where the code under test tried to navigate, or `''`. */
    target: () => target,
    restore: () => {
      if (original) Object.defineProperty(window, 'location', original)
    },
  }
}
