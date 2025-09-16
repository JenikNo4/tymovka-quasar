import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'welcome', component: () => import('pages/WelcomePage.vue') },
      { path: 'auth/callback', name: 'authCallback', component: () => import('pages/AuthCallbackPage.vue') },
      { path: 'dashboard', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
    ],
  },
  // Always leave this as last one
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export default routes;
