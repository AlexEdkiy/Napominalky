import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

const GUEST_ROUTES = new Set(['login', 'register', 'forgot-password', 'reset-password'])

/**
 * Подключает navigation guards:
 * - requireAuth: маршруты с meta.requiresAuth недоступны без токена → /login.
 * - requireAdmin: маршруты с meta.requiresAdmin недоступны не-админам → /lk.
 * - requireGuest: аутентифицированный пользователь на /login|/register → /lk.
 */
export function setupGuards(router: Router): void {
  router.beforeEach((to) => {
    const auth = useAuthStore()

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)

    if (requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (requiresAdmin && !auth.isAdmin) {
      return { name: 'lk-dashboard' }
    }

    if (typeof to.name === 'string' && GUEST_ROUTES.has(to.name) && auth.isAuthenticated) {
      return { name: 'lk-dashboard' }
    }

    if (to.meta.title) {
      document.title = `${to.meta.title} — Reminders App`
    }

    return true
  })
}
