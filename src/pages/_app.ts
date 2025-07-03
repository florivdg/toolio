import type { App } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { clientRouter } from './_clientRouter'

export default (app: App) => {
  // Set up Pinia
  const pinia = createPinia()

  // Set up Pinia Colada
  app.use(pinia)
  app.use(PiniaColada)

  if (clientRouter) app.use(clientRouter)
}
