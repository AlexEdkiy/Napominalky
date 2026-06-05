export type SyncEntityType = 'note' | 'shopping_list' | 'shopping_list_item' | 'reminder'
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
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Серверная запись списка покупок (pull). */
export interface ServerShoppingList {
  uuid: string
  title: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Серверная запись элемента списка покупок (pull). */
export interface ServerShoppingListItem {
  uuid: string
  shopping_list_uuid: string
  name: string
  category: string
  is_checked: boolean
  position: number
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
