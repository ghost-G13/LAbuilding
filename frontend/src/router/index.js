import { createRouter, createWebHistory } from 'vue-router'
import BuildingView from '../views/BuildingView.vue'
import UavView from '../views/UavView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/buildings',
    },
    {
      path: '/buildings',
      name: 'buildings',
      component: BuildingView,
    },
    {
      path: '/uav',
      name: 'uav',
      component: UavView,
    },
  ],
})

export default router
