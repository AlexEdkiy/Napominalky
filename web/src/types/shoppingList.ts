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
 * Статус задачи (списка `type === 'tasks'`) и её пунктов. Осмыслен ТОЛЬКО для
 * tasks: для goods сервер отдаёт дефолт (`new`), UI статус не показывает и не
 * отправляет. Инвариант `done ⇔ is_completed`/`is_checked` обеспечивает сервер.
 */
export type TaskStatus = 'new' | 'in_progress' | 'postponed' | 'done'

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
  /**
   * Флаг «список выполнен» — отдельное поле, НЕ производное от отметок
   * пунктов (решение пользователя): чекбокс в таблице «Задачи и списки»
   * переключает его через PUT /shopping-lists/{uuid}.
   */
  is_completed: boolean
  /** Статус задачи (см. `TaskStatus`); для goods — серверный дефолт, UI его игнорирует. */
  status: TaskStatus
  status_label: string
  /**
   * Закреплён ли статус вручную: пока `false`, сервер сам выводит статус
   * задачи из статусов пунктов; `true` — пользователь выбрал статус явно.
   * Сбрасывается PUT'ом `{ status_is_manual: false }` (пункт «Авто»).
   */
  status_is_manual: boolean
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
  /** Статус пункта (только tasks; `done ⇔ is_checked` гарантирует сервер). */
  status: TaskStatus
  status_label: string
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
  is_completed?: boolean
  /** Только для tasks — для goods фронт статус не отправляет. */
  status?: TaskStatus
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
  is_completed?: boolean
  /** Смена статуса задачи: PUT `{ status }` (сервер закрепит его как ручной). */
  status?: TaskStatus
  /** Сброс закрепления на автоматику: PUT `{ status_is_manual: false }`. */
  status_is_manual?: boolean
}

/**
 * Полезная нагрузка добавления позиции (POST /shopping-lists/{uuid}/items).
 * Поля зеркалят `StoreItemRequest` бэкенда; `tags` — массив на клиенте,
 * сериализуется в JSON-строку в `api/shoppingListsApi.ts` (симметрично
 * `parseTags` при чтении).
 */
export interface CreateShoppingListItemPayload {
  name: string
  category?: ShoppingCategory
  uuid?: string
  quantity?: number
  deadline?: string | null
  reminder_at?: string | null
  link?: string | null
  comment?: string | null
  tags?: string[]
  /** Только для пунктов tasks-списков. */
  status?: TaskStatus
}

/**
 * Полезная нагрузка частичного обновления позиции
 * (PUT /shopping-lists/{uuid}/items/{itemUuid}) — зеркало
 * `UpdateItemRequest` бэкенда. `quantity` НЕ nullable (правило `min:1`);
 * `deadline`/`reminder_at`/`link`/`comment` очищаются явным `null`,
 * теги — пустым массивом (`tags: []` → JSON `"[]"`).
 */
export interface UpdateShoppingListItemPayload {
  name?: string
  category?: ShoppingCategory
  position?: number
  quantity?: number
  deadline?: string | null
  reminder_at?: string | null
  link?: string | null
  comment?: string | null
  tags?: string[]
  /** Смена статуса пункта (только tasks); `is_checked` сервер сведёт сам. */
  status?: TaskStatus
}
