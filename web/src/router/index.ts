import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import './types'

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginView.vue'),
    meta: { title: 'Войти' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/RegisterView.vue'),
    meta: { title: 'Регистрация' },
  },
]

// ---------------------------------------------------------------------------
// /admin — Административная панель (requiresAuth + requiresAdmin)
// Meta явно проставляется на каждом маршруте — Vue Router не наследует
// meta автоматически в getRoutes(), только при runtime-навигации.
// ---------------------------------------------------------------------------
const adminRoutes: RouteRecordRaw = {
  path: '/admin',
  children: [
    {
      path: '',
      name: 'admin-dashboard',
      component: () => import('@/pages/admin/DashboardView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Дашборд' },
    },
    {
      path: 'users',
      name: 'admin-users',
      component: () => import('@/pages/admin/UsersListView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Пользователи' },
    },
    {
      path: 'users/:id',
      name: 'admin-user-detail',
      component: () => import('@/pages/admin/UserDetailView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Пользователь' },
    },
  ],
}

// ---------------------------------------------------------------------------
// /lk — Личный кабинет клиента (requiresAuth)
// ---------------------------------------------------------------------------
const lkRoutes: RouteRecordRaw = {
  path: '/lk',
  children: [
    {
      path: '',
      name: 'lk-dashboard',
      component: () => import('@/pages/lk/DashboardView.vue'),
      meta: { requiresAuth: true, title: 'Личный кабинет' },
    },
    // Account
    {
      path: 'account',
      name: 'lk-account',
      component: () => import('@/pages/lk/AccountView.vue'),
      meta: { requiresAuth: true, title: 'Аккаунт' },
    },
    // Notes
    {
      path: 'notes',
      name: 'lk-notes',
      component: () => import('@/pages/lk/notes/NotesListView.vue'),
      meta: { requiresAuth: true, title: 'Заметки' },
    },
    {
      path: 'notes/new',
      name: 'lk-note-create',
      component: () => import('@/pages/lk/notes/NoteEditView.vue'),
      meta: { requiresAuth: true, title: 'Новая заметка' },
    },
    {
      path: 'notes/:uuid',
      name: 'lk-note-edit',
      component: () => import('@/pages/lk/notes/NoteEditView.vue'),
      meta: { requiresAuth: true, title: 'Заметка' },
    },
    // Shopping lists
    {
      path: 'lists',
      name: 'lk-lists',
      component: () => import('@/pages/lk/lists/ListsView.vue'),
      meta: { requiresAuth: true, title: 'Списки покупок' },
    },
    {
      path: 'lists/:uuid',
      name: 'lk-list-detail',
      component: () => import('@/pages/lk/lists/ListDetailView.vue'),
      meta: { requiresAuth: true, title: 'Список покупок' },
    },
    // Reminders
    {
      path: 'reminders',
      name: 'lk-reminders',
      component: () => import('@/pages/lk/reminders/RemindersView.vue'),
      meta: { requiresAuth: true, title: 'Напоминания' },
    },
    {
      path: 'reminders/:uuid',
      name: 'lk-reminder-edit',
      component: () => import('@/pages/lk/reminders/ReminderEditView.vue'),
      meta: { requiresAuth: true, title: 'Напоминание' },
    },
    // Sync
    {
      path: 'sync',
      name: 'lk-sync',
      component: () => import('@/pages/lk/sync/SyncView.vue'),
      meta: { requiresAuth: true, title: 'Синхронизация' },
    },
    // Calendar
    {
      path: 'calendar',
      name: 'lk-calendar',
      component: () => import('@/pages/lk/calendar/CalendarView.vue'),
      meta: { requiresAuth: true, title: 'Календарь' },
    },
    // Settings
    {
      path: 'settings',
      name: 'lk-settings',
      component: () => import('@/pages/lk/SettingsView.vue'),
      meta: { requiresAuth: true, title: 'Настройки' },
    },
  ],
}

// ---------------------------------------------------------------------------
// Root redirect
// ---------------------------------------------------------------------------
const rootRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/lk',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundView.vue'),
    meta: { title: 'Страница не найдена' },
  },
]

const routes: RouteRecordRaw[] = [
  ...authRoutes,
  adminRoutes,
  lkRoutes,
  ...rootRoutes,
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
