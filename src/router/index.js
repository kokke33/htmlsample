import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/make-prompt',
      name: 'makePrompt',
      component: () => import('../views/MakePrompt.vue'),
      // キャッシュのためにnameを追加
      props: true
    },
    {
      path: '/ai-answer',
      name: 'aiAnswer',
      component: () => import('../views/AIAnswer.vue'),
      // キャッシュのためにnameを追加
      props: true
    },
    {
      path: '/ai-talk',
      name: 'aiTalk',
      component: () => import('../views/AITalk.vue'),
      // キャッシュのためにnameを追加
      props: true
    },
    {
      path: '/chatgpt',
      name: 'chatgpt',
      component: () => import('../views/ChatGPT.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/History.vue'),
      props: true
    },
  ]
})

export default router