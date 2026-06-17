/**
 * Пользователь в представлении администратора.
 * Зеркало AdminUserResource (snake_case).
 *
 * БЛОКЕР ДЛЯ БЭКЕНДА:
 * AdminUserResource не возвращает числовой id — только uuid.
 * Все action-эндпоинты (/status, /password, /roles, DELETE) требуют числового id
 * в URL (Laravel route model binding по id).
 * Без id в ответе ресурса эти действия невозможны.
 * Требуется: добавить `"id"` в AdminUserResource или переопределить
 * getRouteKeyName() в модели User на 'uuid'.
 * Поле id? помечено optional — до правки бэкенда будет undefined,
 * UI будет блокировать кнопки действий при отсутствии id.
 */
export interface AdminUser {
  /** Числовой первичный ключ. ОТСУТСТВУЕТ в текущем AdminUserResource — БЛОКЕР. */
  id?: number
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
