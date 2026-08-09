// @ts-check
import { defineConfig, fontProviders } from 'astro/config'

import node from '@astrojs/node'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone',
  }),

  output: 'server',

  security: {
    // TLS is terminated by the reverse proxy, so the app itself sees plain
    // HTTP. Trust `X-Forwarded-Proto` so `Astro.url` (and with it the built-in
    // CSRF origin check) resolves to https and matches the browser's `Origin`.
    allowedDomains: [{ protocol: 'https' }],
  },

  integrations: [vue({ appEntrypoint: '@/pages/_app.ts' })],

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@pinia/colada', 'pinia'],
    },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      weights: ['400', '700'],
    },
  ],
})
