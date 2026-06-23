import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'welcome', component: () => import('pages/WelcomePage.vue') },
      { path: 'auth/callback', name: 'authCallback', component: () => import('pages/AuthCallbackPage.vue') },
      { path: 'reset-password', name: 'resetPassword', component: () => import('pages/ResetPasswordPage.vue') },
      { path: 'dashboard', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'profile',    name: 'profile',    component: () => import('pages/ProfilePage.vue'),    meta: { requiresAuth: true } },
      { path: 'my-teams',   name: 'myTeams',    component: () => import('pages/MyTeamsPage.vue'),    meta: { requiresAuth: true } },
      { path: 'teams/:id',  name: 'teamDetail', component: () => import('pages/TeamDetailPage.vue'), meta: { requiresAuth: true } },
      { path: 'teams/:id/events', name: 'teamEvents', component: () => import('pages/TeamEventsPage.vue'), meta: { requiresAuth: true } },
      { path: 'events/:id', name: 'eventDetail', component: () => import('pages/EventDetailPage.vue'), meta: { requiresAuth: true } },
      { path: 'my-events',  name: 'myEvents',   component: () => import('pages/MyEventsPage.vue'),   meta: { requiresAuth: true } },
      { path: 'notifications', name: 'notifications', component: () => import('pages/NotificationsPage.vue'), meta: { requiresAuth: true } },
      { path: 'admin',      name: 'adminHome',  component: () => import('pages/AdminHomePage.vue'),  meta: { requiresAuth: true } },
    ],
  },
  // Always leave this as last one
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]

export default routes;
