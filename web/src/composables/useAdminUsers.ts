import { ref } from 'vue'
import { isAxiosError } from 'axios'

import {
  fetchUser,
  fetchUsers,
  setUserStatus,
  setUserPassword,
  setUserRoles,
  deleteUser,
} from '@/api/adminApi'
import type { AdminUser, AdminPaginatedMeta } from '@/types/admin'

interface ActionResult {
  ok: boolean
  error: string | null
}

/**
 * Извлекает читаемое сообщение из ошибки API.
 * 403 — guard (нельзя над собой / последний суперадмин), сообщение из message.
 * 422 — валидация, первое поле errors.
 * Остальные — e.message.
 */
function extractError(e: unknown): string {
  if (isAxiosError(e) && e.response !== undefined) {
    const body = e.response.data as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message
    }
    if (typeof body.errors === 'object' && body.errors !== null) {
      const first = Object.values(body.errors as Record<string, string[]>)[0]
      if (Array.isArray(first) && first.length > 0 && typeof first[0] === 'string') {
        return first[0]
      }
    }
  }
  return e instanceof Error ? e.message : 'Не удалось выполнить операцию'
}

/**
 * Состояние постраничного списка пользователей для админ-панели.
 */
export function useAdminUsers() {
  const users = ref<AdminUser[]>([])
  const meta = ref<AdminPaginatedMeta | null>(null)
  const page = ref(1)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(targetPage = 1): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetchUsers(targetPage)
      users.value = response.data
      meta.value = response.meta
      page.value = targetPage
    } catch (e) {
      error.value = extractError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function nextPage(): Promise<void> {
    const lastPage = meta.value?.last_page ?? 1
    if (page.value < lastPage) {
      await load(page.value + 1)
    }
  }

  async function prevPage(): Promise<void> {
    if (page.value > 1) {
      await load(page.value - 1)
    }
  }

  /**
   * Быстрое переключение статуса прямо из списка.
   * Обновляет запись in-place без перезагрузки страницы.
   */
  async function toggleStatus(user: AdminUser): Promise<ActionResult> {
    if (user.id === undefined) {
      return { ok: false, error: 'Действие недоступно: сервер не вернул числовой id пользователя.' }
    }
    try {
      const updated = await setUserStatus(user.id, !user.is_active)
      const idx = users.value.findIndex((u) => u.uuid === user.uuid)
      if (idx !== -1) {
        users.value[idx] = updated
      }
      return { ok: true, error: null }
    } catch (e) {
      return { ok: false, error: extractError(e) }
    }
  }

  return { users, meta, page, isLoading, error, load, nextPage, prevPage, toggleStatus }
}

/**
 * Состояние детальной карточки одного пользователя + управляющие действия.
 */
export function useAdminUser(id: string | number) {
  const user = ref<AdminUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const actionError = ref<string | null>(null)
  const actionPending = ref(false)

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      user.value = await fetchUser(id)
    } catch (e) {
      error.value = extractError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function toggleStatus(): Promise<ActionResult> {
    const numericId = user.value?.id
    if (numericId === undefined) {
      return { ok: false, error: 'Действие недоступно: сервер не вернул числовой id пользователя.' }
    }
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await setUserStatus(numericId, !user.value?.is_active)
      user.value = updated
      return { ok: true, error: null }
    } catch (e) {
      actionError.value = extractError(e)
      return { ok: false, error: actionError.value }
    } finally {
      actionPending.value = false
    }
  }

  async function changePassword(password: string, passwordConfirmation: string): Promise<ActionResult> {
    const numericId = user.value?.id
    if (numericId === undefined) {
      return { ok: false, error: 'Действие недоступно: сервер не вернул числовой id пользователя.' }
    }
    actionPending.value = true
    actionError.value = null
    try {
      await setUserPassword(numericId, password, passwordConfirmation)
      return { ok: true, error: null }
    } catch (e) {
      actionError.value = extractError(e)
      return { ok: false, error: actionError.value }
    } finally {
      actionPending.value = false
    }
  }

  async function updateRoles(isAdmin: boolean, isSuperAdmin: boolean): Promise<ActionResult> {
    const numericId = user.value?.id
    if (numericId === undefined) {
      return { ok: false, error: 'Действие недоступно: сервер не вернул числовой id пользователя.' }
    }
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await setUserRoles(numericId, isAdmin, isSuperAdmin)
      user.value = updated
      return { ok: true, error: null }
    } catch (e) {
      actionError.value = extractError(e)
      return { ok: false, error: actionError.value }
    } finally {
      actionPending.value = false
    }
  }

  async function removeUser(): Promise<ActionResult> {
    const numericId = user.value?.id
    if (numericId === undefined) {
      return { ok: false, error: 'Действие недоступно: сервер не вернул числовой id пользователя.' }
    }
    actionPending.value = true
    actionError.value = null
    try {
      await deleteUser(numericId)
      return { ok: true, error: null }
    } catch (e) {
      actionError.value = extractError(e)
      return { ok: false, error: actionError.value }
    } finally {
      actionPending.value = false
    }
  }

  return {
    user,
    isLoading,
    error,
    actionError,
    actionPending,
    load,
    toggleStatus,
    changePassword,
    updateRoles,
    removeUser,
  }
}
