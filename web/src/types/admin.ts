/**
 * Пользователь в представлении администратора.
 * Зеркало AdminUserResource (snake_case).
 *
 * ЗАМЕЧАНИЕ ПО КОНТРАКТУ (id vs uuid):
 * AdminUserResource возвращает только uuid, числовой id не включён.
 * Однако GET /api/v1/admin/users/{user} использует route model binding
 * по числовому id (User::getRouteKeyName() не переопределён).
 * Это рассинхрон: построить ссылку на detail-страницу по числовому id
 * из списка невозможно. MVP-решение: используем uuid в роуте /admin/users/:id
 * и передаём uuid в fetchUser. Если backend принимает uuid — работает.
 * Если нет — баг контракта, требует правки AdminUserResource (добавить id)
 * или переопределения getRouteKeyName() в модели User.
 */
export interface AdminUser {
  uuid: string
  name: string | null
  email: string
  is_admin: boolean
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
