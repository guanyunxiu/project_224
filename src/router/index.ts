import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/pages/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      redirect: '/flows',
    },
    {
      path: '/flows',
      name: 'FlowList',
      component: () => import('@/pages/FlowList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/flows/designer/:id',
      name: 'FlowDesigner',
      component: () => import('@/pages/FlowDesigner/index.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/apply',
      name: 'ApplyForm',
      component: () => import('@/pages/ApplyForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todo',
      name: 'TodoList',
      component: () => import('@/pages/TodoList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/done',
      name: 'DoneList',
      component: () => import('@/pages/DoneList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mine',
      name: 'MineList',
      component: () => import('@/pages/MineList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/application/:id',
      name: 'ApplicationDetail',
      component: () => import('@/pages/ApplicationDetail.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/flows')
  } else {
    next()
  }
})

export default router
