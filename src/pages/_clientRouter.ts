import { createRouter, createWebHistory, type Router } from 'vue-router'

let clientRouter: Router | null = null

if (!import.meta.env.SSR) {
  clientRouter = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/tools/itunes',
        redirect: '/tools/itunes/search',
        children: [
          {
            path: 'search',
            component: () => import('@/components/itunes/SearchView.vue'),
          },
          {
            path: 'watchlist',
            component: () => import('@/components/itunes/WatchlistView.vue'),
          },
        ],
      },
    ],
  })
}

export { clientRouter }
