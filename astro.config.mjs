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

  integrations: [vue()],

  vite: {
    plugins: [tailwindcss()],
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Geist Mono',
        cssVariable: '--font-geist-mono',
      },
    ],
  },
})
