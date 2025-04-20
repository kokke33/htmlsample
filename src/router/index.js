
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
      props: true
    },
    {
      path: '/ai-answer',
      name: 'aiAnswer',
      component: () => import('../views/AIAnswer.vue'),
      props: true
    },
    {
      path: '/ai-talk',
      name: 'aiTalk',
      component: () => import('../views/AITalk.vue'),
      props: true
    },
    {
      path: '/chatgpt',
      name: 'chatgpt',
      component: () => import('../views/ChatGPT.vue'),
      props: true
    },
    {
      path: '/ai-rag',
      name: 'aiRag',
      component: () => import('../views/AIRAG.vue'),
      props: true
    }
  ]
})

export default router
