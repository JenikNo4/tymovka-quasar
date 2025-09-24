import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory  } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'welcome', component: () => import('pages/WelcomePage.vue') },
      { path: 'auth/callback', name: 'authCallback', component: () => import('pages/AuthCallbackPage.vue') },
      { path: 'dashboard', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'profile',    name: 'profile',    component: () => import('pages/ProfilePage.vue'),    meta: { requiresAuth: true } },
      { path: 'my-teams',   name: 'myTeams',    component: () => import('pages/MyTeamsPage.vue'),    meta: { requiresAuth: true } },
      { path: 'my-events',  name: 'myEvents',   component: () => import('pages/MyEventsPage.vue'),   meta: { requiresAuth: true } },
      { path: 'admin',      name: 'adminHome',  component: () => import('pages/AdminHomePage.vue'),  meta: { requiresAuth: true } },
    ],
  },
  // Always leave this as last one
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.meLoaded) await auth.fetchMe()
  if (to.meta?.requiresAuth && !auth.isLogged) return { name: 'welcome' }
})


export default routes;
