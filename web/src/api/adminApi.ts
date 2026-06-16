import { apiClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type { AdminUser } from '@/types/admin'

/**
 * Получить постраничный список пользователей.
 * GET /api/v1/admin/users?page=N
 */
export async function fetchUsers(page = 1): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', {
    params: { page },
  })
  return data
}

/**
 * Получить данные одного пользователя с агрегатами (notes/reminders/lists count).
 * GET /api/v1/admin/users/{id}
 *
 * MVP: передаём uuid, т.к. AdminUserResource не содержит числового id.
 * Если backend не поддерживает uuid — см. замечание в src/types/admin.ts.
 */
export async function fetchUser(id: string | number): Promise<AdminUser> {
  const { data } = await apiClient.get<{ data: AdminUser }>(`/admin/users/${String(id)}`)
  return data.data
}
