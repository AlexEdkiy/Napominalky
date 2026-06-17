/**
 * Пользователь в представлении администратора.
 * Зеркало AdminUserResource (snake_case).
 * Идентификатор для всех action-эндпоинтов — uuid (route model binding по uuid).
 */
export interface AdminUser {
  uuid: string
  name: string | null
  email: string
  is_admin: boolean
  is_super_admin: boolean
  is_active: boolean
  sync_enabled: boolean
  created_at: string
  /** Доступно только в detail-запросе (с loadCount) */
  notes_count?: number | null
  /** Доступно только в detail-запросе (с loadCount) */
  reminders_count?: number | null
  /** Доступно только в detail-запросе (с loadCount) */
  lists_count?: number | null
}

/**
 * Обёртка пагинированного ответа API.
 * Совместима со структурой Laravel ResourceCollection.
 */
export interface AdminPaginatedMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AdminPaginated<T> {
  data: T[]
  meta: AdminPaginatedMeta
}
