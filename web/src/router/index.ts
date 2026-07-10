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
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/auth/ForgotPasswordView.vue'),
    meta: { title: 'Забыли пароль?' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/auth/ResetPasswordView.vue'),
    meta: { title: 'Сброс пароля' },
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
  component: () => import('@/layouts/LkLayout.vue'),
  // requiresAuth на родителе — наследуется всеми дочерними разделами.
  // Guard проверяет через to.matched.some(...), что корректно учитывает наследование.
  meta: { requiresAuth: true },
  children: [
    {
      path: '',
      name: 'lk-dashboard',
      component: () => import('@/pages/lk/DashboardView.vue'),
      meta: { title: 'Личный кабинет' },
    },
    // Account
    {
      path: 'account',
      name: 'lk-account',
      component: () => import('@/pages/lk/AccountView.vue'),
      meta: { title: 'Аккаунт' },
    },
    // Notes
    {
      path: 'notes',
      name: 'lk-notes',
      component: () => import('@/pages/lk/notes/NotesListView.vue'),
      meta: { title: 'Заметки' },
    },
    // Форма заметки — центральная модалка (`LkNoteFormDialog`, рендерится в
    // `LkLayout`), не отдельная страница. Эти 2 маршрута — только тонкие
    // deep-link редиректы (см. `NoteFormRedirectView.vue`): открывают модалку
    // через `useLkForms` и сразу возвращают на список заметок.
    {
      path: 'notes/new',
      name: 'lk-note-create',
      component: () => import('@/pages/lk/notes/NoteFormRedirectView.vue'),
      meta: { title: 'Новая заметка' },
    },
    {
      path: 'notes/:uuid',
      name: 'lk-note-edit',
      component: () => import('@/pages/lk/notes/NoteFormRedirectView.vue'),
      meta: { title: 'Заметка' },
    },
    // Задачи и списки — раздел редизайна ЛК (фаза 2: полноценный вид с
    // фильтрами/сортировкой и right-rail). /lk/lists остаётся рабочим
    // deep-link на старый ListsView (см. web-lk-phase2.md).
    {
      path: 'tasks',
      name: 'lk-tasks',
      component: () => import('@/pages/lk/tasks/TasksView.vue'),
      meta: { title: 'Задачи и списки' },
    },
    // Shopping lists
    {
      path: 'lists',
      name: 'lk-lists',
      component: () => import('@/pages/lk/lists/ListsView.vue'),
      meta: { title: 'Списки покупок' },
    },
    {
      path: 'lists/:uuid',
      name: 'lk-list-detail',
      component: () => import('@/pages/lk/lists/ListDetailView.vue'),
      meta: { title: 'Список покупок' },
    },
    // Reminders
    {
      path: 'reminders',
      name: 'lk-reminders',
      component: () => import('@/pages/lk/reminders/RemindersView.vue'),
      meta: { title: 'Напоминания' },
    },
    // Форма напоминания — центральная модалка (`LkReminderFormDialog`,
    // рендерится в `LkLayout`), не отдельная страница. Эти 2 маршрута —
    // тонкие deep-link редиректы (см. `ReminderFormRedirectView.vue`).
    {
      path: 'reminders/new',
      name: 'lk-reminder-create',
      component: () => import('@/pages/lk/reminders/ReminderFormRedirectView.vue'),
      meta: { title: 'Новое напоминание' },
    },
    {
      path: 'reminders/:uuid',
      name: 'lk-reminder-edit',
      component: () => import('@/pages/lk/reminders/ReminderFormRedirectView.vue'),
      meta: { title: 'Напоминание' },
    },
    // Sync
    {
      path: 'sync',
      name: 'lk-sync',
      component: () => import('@/pages/lk/sync/SyncView.vue'),
      meta: { title: 'Синхронизация' },
    },
    // Calendar
    {
      path: 'calendar',
      name: 'lk-calendar',
      component: () => import('@/pages/lk/calendar/CalendarView.vue'),
      meta: { title: 'Календарь' },
    },
    // Settings
    {
      path: 'settings',
      name: 'lk-settings',
      component: () => import('@/pages/lk/SettingsView.vue'),
      meta: { title: 'Настройки' },
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
