import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/flows',
    },
    {
      path: '/flows',
      name: 'FlowList',
      component: () => import('@/pages/FlowList.vue'),
    },
    {
      path: '/flows/designer/:id',
      name: 'FlowDesigner',
      component: () => import('@/pages/FlowDesigner/index.vue'),
    },
    {
      path: '/apply',
      name: 'ApplyForm',
      component: () => import('@/pages/ApplyForm.vue'),
    },
    {
      path: '/todo',
      name: 'TodoList',
      component: () => import('@/pages/TodoList.vue'),
    },
    {
      path: '/done',
      name: 'DoneList',
      component: () => import('@/pages/DoneList.vue'),
    },
    {
      path: '/mine',
      name: 'MineList',
      component: () => import('@/pages/MineList.vue'),
    },
    {
      path: '/application/:id',
      name: 'ApplicationDetail',
      component: () => import('@/pages/ApplicationDetail.vue'),
    },
  ],
})

export default router
