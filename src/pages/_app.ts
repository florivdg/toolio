import type { App } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { clientRouter } from './_clientRouter'

export default (app: App) => {
  const pinia = createPinia()
  app.use(pinia)
  app.use(PiniaColada, {
    queryOptions: {
      gcTime: 300_000, // 5 minutes
    },
  })
  if (clientRouter) app.use(clientRouter)
}
