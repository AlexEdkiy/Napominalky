/**
 * Спорная запись синхронизации — зеркало ConflictResource (snake_case).
 * server_payload / client_payload — произвольные снимки сущности,
 * структура зависит от entity_type, поэтому Record<string, unknown>.
 */
export interface SyncConflict {
  uuid: string
  entity_type: string
  entity_uuid: string
  server_payload: Record<string, unknown>
  client_payload: Record<string, unknown>
  resolved_at: string | null
  created_at: string
}

/**
 * Метаданные delta-pull (GET /sync/changes) — зеркало meta из SyncChangesResource.
 * cursor — последняя выданная ревизия, has_more — есть ли ещё страницы.
 */
export interface SyncChangesMeta {
  cursor: number
  has_more: boolean
}

/**
 * Блок данных delta-pull: по одному списку записей на сущность.
 * Каждая запись сериализована под клиентскую SQLite-схему (включая tombstones).
 */
export interface SyncChangesData {
  notes: Array<Record<string, unknown>>
  shopping_lists: Array<Record<string, unknown>>
  shopping_list_items: Array<Record<string, unknown>>
  reminders: Array<Record<string, unknown>>
}

/**
 * Полный ответ GET /sync/changes — `{ data, meta }` без обёртки JsonResource.
 */
export interface SyncChangesResponse {
  data: SyncChangesData
  meta: SyncChangesMeta
}

/**
 * Параметры delta-pull (GET /sync/changes).
 */
export interface SyncChangesParams {
  since: number
  limit?: number
}
