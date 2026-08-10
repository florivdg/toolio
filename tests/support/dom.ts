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
