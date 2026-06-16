import { ref } from 'vue'

import { fetchUser, fetchUsers } from '@/api/adminApi'
import type { AdminUser, AdminPaginatedMeta } from '@/types/admin'

function resolveErrorMessage(e: unknown): string {
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
      error.value = resolveErrorMessage(e)
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

  return { users, meta, page, isLoading, error, load, nextPage, prevPage }
}

/**
 * Состояние детальной карточки одного пользователя.
 */
export function useAdminUser(id: string | number) {
  const user = ref<AdminUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      user.value = await fetchUser(id)
    } catch (e) {
      error.value = resolveErrorMessage(e)
    } finally {
      isLoading.value = false
    }
  }

  return { user, isLoading, error, load }
}
