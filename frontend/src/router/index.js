import { createRouter, createWebHistory } from 'vue-router'
import CesiumScene from '../components/CesiumScene.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'CesiumScene',
      component: CesiumScene,
    },
  ],
})

export default router
