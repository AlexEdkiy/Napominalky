/**
 * Категория позиции списка покупок.
 */
export type ShoppingCategory = 'products' | 'household' | 'pharmacy' | 'other'

/**
 * Список покупок — зеркало ShoppingListResource (snake_case).
 *
 * ВНИМАНИЕ (расхождение с реальным API, обнаружено при разработке фазы 2 —
 * см. web-lk-phase2.md): фактический `ShoppingListResource` на бэкенде
 * дополнительно отдаёт поля `type` и `tags`, которых нет в этом интерфейсе.
 * Бриф фазы 2 явно указывал считать их отсутствующими («не выдумывать
 * поля») — интерфейс оставлен как есть, чтобы не расширять скоуп фазы
 * молча, но это следует свести с ARCH/MBE и обновить в одной из следующих
 * фаз (реальная типизация «категории/тега» списка, а не только пунктов).
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
 *
 * ВНИМАНИЕ (расхождение с реальным API, см. пометку у `ShoppingList` выше):
 * фактический `ShoppingListItemResource` дополнительно отдаёт `quantity`,
 * `deadline`, `reminder_at`, `link`, `comment`, `tags` — ни одно из этих
 * полей здесь не отражено. Бриф фазы 2 прямым текстом требовал считать, что
 * у пункта нет тегов/дат/времени/привязки к напоминанию, поэтому в этой фазе
 * интерфейс намеренно не расширен; правка — предмет отдельной задачи.
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
