import type { Router } from 'vue-router'

/**
 * Guard-заглушка. Реализация — в WEB-1 (authStore + полная логика).
 * Блокирует маршруты requiresAuth / requiresAdmin.
 */
export function setupGuards(router: Router): void {
  router.beforeEach((to) => {
    // TODO WEB-1: заменить на проверку authStore.isAuthenticated / isAdmin
    const isAuthenticated = false
    const isAdmin = false

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { name: 'login' }
    }

    if (to.meta.requiresAdmin && !isAdmin) {
      return { name: 'lk-dashboard' }
    }

    if (to.meta.title) {
      document.title = `${to.meta.title} — Reminders App`
    }
  })
}
