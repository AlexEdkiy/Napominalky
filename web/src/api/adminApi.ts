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
 * Принимает числовой id (route model binding) или uuid (если backend исправлен).
 * БЛОКЕР: текущий AdminUserResource не отдаёт числовой id, поэтому
 * переход на деталь возможен только если backend добавит id в ресурс.
 */
export async function fetchUser(id: string | number): Promise<AdminUser> {
  const { data } = await apiClient.get<{ data: AdminUser }>(`/admin/users/${String(id)}`)
  return data.data
}

/**
 * Обновить статус активности пользователя.
 * PATCH /api/v1/admin/users/{id}/status
 * Требует числовой id в URL — БЛОКЕР пока AdminUserResource не отдаёт id.
 */
export async function setUserStatus(id: number, isActive: boolean): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ data: AdminUser }>(
    `/admin/users/${id}/status`,
    { is_active: isActive },
  )
  return data.data
}

/**
 * Сменить пароль пользователя.
 * PATCH /api/v1/admin/users/{id}/password → 204 No Content
 */
export async function setUserPassword(
  id: number,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await apiClient.patch(`/admin/users/${id}/password`, {
    password,
    password_confirmation: passwordConfirmation,
  })
}

/**
 * Обновить роли пользователя.
 * PATCH /api/v1/admin/users/{id}/roles
 * Инвариант: is_super_admin=true ⇒ is_admin=true (бэкенд выставит автоматически).
 */
export async function setUserRoles(
  id: number,
  isAdmin: boolean,
  isSuperAdmin: boolean,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ data: AdminUser }>(
    `/admin/users/${id}/roles`,
    { is_admin: isAdmin, is_super_admin: isSuperAdmin },
  )
  return data.data
}

/**
 * Удалить пользователя.
 * DELETE /api/v1/admin/users/{id} → 204 No Content
 */
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`)
}
