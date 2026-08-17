export type SyncEntityType =
  | 'note'
  | 'shopping_list'
  | 'shopping_list_item'
  | 'shopping_list_item_comment'
  | 'reminder'
export type SyncOperation = 'create' | 'update' | 'delete'

/** Исходящее локальное изменение, отправляемое на сервер (push). */
export interface SyncChange {
  entity_type: SyncEntityType
  uuid: string
  operation: SyncOperation
  payload: Record<string, unknown>
  updated_at: string
}

/**
 * Серверная запись заметки (pull). Плоский объект под клиентскую схему:
 * booleans приходят как true/false, даты — ISO-строки, deleted_at != null —
 * tombstone.
 */
export interface ServerNote {
  uuid: string
  title: string
  body: string | null
  color: string | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Серверная запись списка покупок (pull). status/status_is_manual/is_completed
 * — статусная модель задач (значимы только для type='tasks'): status —
 * 'new'|'in_progress'|'postponed'|'done', status_is_manual — статус закреплён
 * вручную, is_completed ⇔ status='done' (сервер нормализует инвариант).
 */
export interface ServerShoppingList {
  uuid: string
  title: string
  type: string
  tags: string | null
  status: string
  status_is_manual: boolean
  is_completed: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Серверная запись элемента списка покупок (pull). reminder_at — ISO-строка
 * абсолютного момента напоминания пункта (immutable_datetime на backend);
 * link/comment/tags — мета-поля пункта (tags — JSON-строка, как и локально).
 */
export interface ServerShoppingListItem {
  uuid: string
  shopping_list_uuid: string
  name: string
  category: string
  quantity: number
  deadline: string | null
  reminder_at: string | null
  link: string | null
  comment: string | null
  tags: string | null
  is_checked: boolean
  /** Статус пункта задачи ('new'|'in_progress'|'postponed'|'done');
   *  инвариант status='done' ⇔ is_checked (сервер нормализует). */
  status: string
  position: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Серверная запись комментария-треда к пункту (pull). Родитель —
 * shopping_list_item_uuid (публичный uuid пункта), author_name — снимок имени
 * автора на момент создания, deleted_at != null — tombstone.
 */
export interface ServerShoppingListItemComment {
  uuid: string
  shopping_list_item_uuid: string
  author_name: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Серверная запись напоминания (pull). */
export interface ServerReminder {
  uuid: string
  title: string
  notes: string | null
  remind_at: string
  recurrence: string
  is_completed: boolean
  completed_at: string | null
  snoozed_until: string | null
  source_uuid: string | null
  source_type: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Ответ GET /sync/changes — изменения по сущностям + курсор пагинации. */
export interface SyncChangesResponse {
  data: {
    notes: ServerNote[]
    shopping_lists: ServerShoppingList[]
    shopping_list_items: ServerShoppingListItem[]
    /** Опционально: старый сервер может не отдавать комментарии-треды. */
    shopping_list_item_comments?: ServerShoppingListItemComment[]
    reminders: ServerReminder[]
  }
  meta: {
    cursor: number
    has_more: boolean
  }
}

/** Конфликт LWW, который сервер вернул в ответ на push. */
export interface Conflict {
  entity_type: SyncEntityType
  entity_uuid: string
  server_payload: Record<string, unknown>
  client_payload: Record<string, unknown>
}

/** Результат POST /sync/push: применённые uuid, конфликты, новый курсор. */
export interface SyncPushResult {
  applied: string[]
  conflicts: Conflict[]
  cursor: number
}
