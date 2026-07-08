/**
 * Категория позиции списка покупок.
 */
export type ShoppingCategory = 'products' | 'household' | 'pharmacy' | 'other'

/**
 * Тип списка: `goods` — «Купить» (список покупок), `tasks` — «Сделать»
 * (список дел).
 */
export type ShoppingListType = 'goods' | 'tasks'

/**
 * Список покупок — зеркало ShoppingListResource (snake_case), нормализованное
 * на клиенте: `tags` — уже разобранный `string[]` (сервер хранит и отдаёт
 * его непрозрачной JSON-строкой в TEXT-колонке; парсинг — в
 * `api/shoppingListsApi.ts` через `utils/tags.ts#parseTags`, чтобы UI-слой
 * везде работал с готовым массивом).
 */
export interface ShoppingList {
  uuid: string
  title: string
  type: ShoppingListType
  tags: string[]
  items_count: number
  checked_items_count: number
  created_at: string
  updated_at: string
}

/**
 * Позиция списка покупок — зеркало ShoppingListItemResource (snake_case),
 * нормализованное на клиенте (`tags` уже разобран, см. пометку у
 * `ShoppingList` выше). `deadline` — только дата (`YYYY-MM-DD`, без
 * времени — известное ограничение бэкенда). `reminder_at` — дата и время
 * (ISO 8601), отдельная привязка к напоминанию на уровне пункта (не путать с
 * сущностью `Reminder` из `types/reminder.ts`).
 */
export interface ShoppingListItem {
  uuid: string
  name: string
  category: ShoppingCategory
  category_label: string
  is_checked: boolean
  position: number
  quantity: number | null
  deadline: string | null
  reminder_at: string | null
  link: string | null
  comment: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

/**
 * Параметры запроса списка списков покупок (GET /shopping-lists).
 */
export interface ShoppingListParams {
  page?: number
  per_page?: number
}

/**
 * Полезная нагрузка создания списка (POST /shopping-lists).
 * `uuid` опционален — клиент может задать его для офлайн-синхронизации.
 * `type` по умолчанию `goods` (см. `StoreListRequest` на бэкенде). `tags` —
 * массив имён тегов на клиенте; сериализуется в непрозрачную JSON-строку
 * перед отправкой (см. `api/shoppingListsApi.ts`), симметрично `parseTags`
 * при чтении.
 */
export interface CreateShoppingListPayload {
  title: string
  type?: ShoppingListType
  tags?: string[]
  uuid?: string
}

/**
 * Полезная нагрузка обновления списка (PUT /shopping-lists/{uuid}).
 * `type`/`tags` опциональны — метаданные списка можно менять частично
 * (UI редактирования этих полей не обязателен, но контракт готов к нему).
 */
export interface UpdateShoppingListPayload {
  title?: string
  type?: ShoppingListType
  tags?: string[]
}

/**
 * Полезная нагрузка добавления позиции (POST /shopping-lists/{uuid}/items).
 */
export interface CreateShoppingListItemPayload {
  name: string
  category?: ShoppingCategory
  uuid?: string
}

/**
 * Полезная нагрузка частичного обновления позиции
 * (PUT /shopping-lists/{uuid}/items/{itemUuid}).
 */
export interface UpdateShoppingListItemPayload {
  name?: string
  category?: ShoppingCategory
  position?: number
}
