/**
 * Категория позиции списка покупок.
 */
export type ShoppingCategory = 'products' | 'household' | 'pharmacy' | 'other'

/**
 * Список покупок — зеркало ShoppingListResource (snake_case).
 */
export interface ShoppingList {
  uuid: string
  title: string
  items_count: number
  checked_items_count: number
  created_at: string
  updated_at: string
}

/**
 * Позиция списка покупок — зеркало ShoppingListItemResource (snake_case).
 */
export interface ShoppingListItem {
  uuid: string
  name: string
  category: ShoppingCategory
  category_label: string
  is_checked: boolean
  position: number
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
 */
export interface CreateShoppingListPayload {
  title: string
  uuid?: string
}

/**
 * Полезная нагрузка обновления списка (PUT /shopping-lists/{uuid}).
 */
export interface UpdateShoppingListPayload {
  title: string
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
