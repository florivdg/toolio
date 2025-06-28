import type { App } from 'vue'
import { createPinia, type Pinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { clientRouter } from './_clientRouter'

export default (app: App) => {
  // Set up Pinia
  const pinia: Pinia = createPinia()
  
  // Set up Pinia Colada
  pinia.use(PiniaColada)
  app.use(pinia)

  if (clientRouter) app.use(clientRouter)
}
