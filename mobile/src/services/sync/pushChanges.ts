import { asc, inArray } from 'drizzle-orm'

import { db as defaultDb, type Database } from '@/db/client'
import { syncOutbox, type SyncOutboxRow } from '@/db/schema/syncOutbox'
import { syncApi } from '@/api/syncApi'
import type { SyncChange, SyncEntityType, SyncPushResult } from '@/types/sync'
import { withBackoff } from './backoff'
import { getDeviceName, getOrCreateDeviceUuid } from './syncMeta'

/** Лимит changes в backend PushRequest (MBE-21). */
const PUSH_BATCH_SIZE = 500

/** Преобразует строку outbox в исходящее изменение для API. */
const toChange = (row: SyncOutboxRow): SyncChange => ({
  entity_type: row.entityType as SyncEntityType,
  uuid: row.entityUuid,
  operation: row.operation,
  payload: JSON.parse(row.payload) as Record<string, unknown>,
  updated_at: row.updatedAt,
})

/**
 * Удаляет только подтверждённые строки отправленного батча по их ID.
 * Новые правки той же сущности, созданные во время запроса, остаются в очереди.
 * Конфликт LWW означает, что клиентская версия сохранена на сервере в бэкапе,
 * а серверная придёт через pull; конфликтную строку повторно не отправляем.
 */
const clearOutbox = async (
  db: Database,
  rows: readonly SyncOutboxRow[],
  result: SyncPushResult,
): Promise<void> => {
  const applied = new Set(result.applied)
  const conflicts = new Set(result.conflicts.map((entry) => `${entry.entity_type}:${entry.entity_uuid}`))
  const ids = rows
    .filter((row) => applied.has(row.entityUuid) || conflicts.has(`${row.entityType}:${row.entityUuid}`))
    .map((row) => row.id)
  if (ids.length === 0) return
  await db.delete(syncOutbox).where(inArray(syncOutbox.id, ids))
}

/** Подтверждает каждый батч отдельно: сбой следующего не теряет оставшуюся очередь. */
const pushBatch = async (
  db: Database,
  rows: readonly SyncOutboxRow[],
  deviceUuid: string,
  deviceName: string | null,
): Promise<SyncPushResult> => {
  const changes = rows.map(toChange)
  const result = await withBackoff(() => syncApi.pushChanges(deviceUuid, deviceName, changes))
  await clearOutbox(db, rows, result)
  return result
}

/**
 * Отправляет снимок очереди по порядку ID батчами до 500 записей.
 * Новые и неподтверждённые правки остаются до следующего запуска синхронизации.
 * Возвращает суммарный результат или null, если очередь пуста.
 */
export const pushChanges = async (
  db: Database = defaultDb,
): Promise<SyncPushResult | null> => {
  const rows = await db.select().from(syncOutbox).orderBy(asc(syncOutbox.id))
  if (rows.length === 0) return null

  const deviceUuid = await getOrCreateDeviceUuid(db)
  const deviceName = await getDeviceName(db)
  const result: SyncPushResult = { applied: [], conflicts: [], cursor: 0 }
  for (let offset = 0; offset < rows.length; offset += PUSH_BATCH_SIZE) {
    const batch = await pushBatch(db, rows.slice(offset, offset + PUSH_BATCH_SIZE), deviceUuid, deviceName)
    result.applied.push(...batch.applied)
    result.conflicts.push(...batch.conflicts)
    result.cursor = Math.max(result.cursor, batch.cursor)
  }
  return result
}
