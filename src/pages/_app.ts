import type { App } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { clientRouter } from './_clientRouter'

// Consumed by @astrojs/vue as the `appEntrypoint` configured in astro.config.mjs.
// The integration resolves it through the '@/pages/_app.ts' alias, which fallow's
// Astro plugin does not follow, so the default export looks unreferenced.
// fallow-ignore-next-line unused-export
export default (app: App) => {
  // Set up Pinia
  const pinia = createPinia()

  // Set up Pinia Colada
  app.use(pinia)
  app.use(PiniaColada)

  if (clientRouter) app.use(clientRouter)
}
