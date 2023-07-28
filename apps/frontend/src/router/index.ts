import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: async () => await import('@/views/HomeView.vue'),
      meta: { title: 'Home | Game Deal' }
    },
    {
      path: '/game/:id',
      name: 'game',
      component: async () => await import('@/views/GameView.vue')
    },
    {
      path: '/error',
      component: async () => await import('@/views/InternalError.vue'),
      meta: { title: '500 - Internal Error' }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: async () => await import('@/views/NotFound.vue'),
      meta: { title: '404 - Not Found' }
    }
  ]
})

router.afterEach((to) => {
  document.title = to.meta.title ?? 'Game Deal'
})

export default router
