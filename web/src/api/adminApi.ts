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
 * GET /api/v1/admin/users/{uuid}
 */
export async function fetchUser(uuid: string): Promise<AdminUser> {
  const { data } = await apiClient.get<{ data: AdminUser }>(`/admin/users/${uuid}`)
  return data.data
}

/**
 * Обновить статус активности пользователя.
 * PATCH /api/v1/admin/users/{uuid}/status
 */
export async function setUserStatus(uuid: string, isActive: boolean): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ data: AdminUser }>(
    `/admin/users/${uuid}/status`,
    { is_active: isActive },
  )
  return data.data
}

/**
 * Сменить пароль пользователя.
 * PATCH /api/v1/admin/users/{uuid}/password → 204 No Content
 */
export async function setUserPassword(
  uuid: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await apiClient.patch(`/admin/users/${uuid}/password`, {
    password,
    password_confirmation: passwordConfirmation,
  })
}

/**
 * Обновить роли пользователя.
 * PATCH /api/v1/admin/users/{uuid}/roles
 * Инвариант: is_super_admin=true ⇒ is_admin=true (бэкенд выставит автоматически).
 */
export async function setUserRoles(
  uuid: string,
  isAdmin: boolean,
  isSuperAdmin: boolean,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ data: AdminUser }>(
    `/admin/users/${uuid}/roles`,
    { is_admin: isAdmin, is_super_admin: isSuperAdmin },
  )
  return data.data
}

/**
 * Удалить пользователя.
 * DELETE /api/v1/admin/users/{uuid} → 204 No Content
 */
export async function deleteUser(uuid: string): Promise<void> {
  await apiClient.delete(`/admin/users/${uuid}`)
}
