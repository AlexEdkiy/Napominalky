import { asc, inArray } from 'drizzle-orm'

import { db as defaultDb, type Database } from '@/db/client'
import { syncOutbox, type SyncOutboxRow } from '@/db/schema/syncOutbox'
import { syncApi } from '@/api/syncApi'
import type {
  SyncChange,
  SyncEntityType,
  SyncPushResult,
} from '@/types/sync'
import { withBackoff } from './backoff'
import { getDeviceName, getOrCreateDeviceUuid } from './syncMeta'

/** Преобразует строку outbox в исходящее изменение для API. */
const toChange = (row: SyncOutboxRow): SyncChange => ({
  entity_type: row.entityType as SyncEntityType,
  uuid: row.entityUuid,
  operation: row.operation,
  payload: JSON.parse(row.payload) as Record<string, unknown>,
  updated_at: row.updatedAt,
})

/**
 * Удаляет из outbox записи по списку entity_uuid (применённые + конфликтные).
 * Решение по конфликтам (LWW): сервер вернул конфликт = клиент проиграл, его
 * версия сохранена в бэкапе на сервере, а локальная будет перезаписана
 * ближайшим pull. Поэтому конфликтные записи тоже удаляем — иначе они будут
 * пушиться бесконечно.
 */
const clearOutbox = async (
  db: Database,
  uuids: readonly string[],
): Promise<void> => {
  if (uuids.length === 0) return
  await db.delete(syncOutbox).where(inArray(syncOutbox.entityUuid, [...uuids]))
}

/**
 * Отправляет накопленные локальные изменения (sync_outbox) на сервер.
 * Возвращает null, если очередь пуста. После успешного push очищает из outbox
 * применённые и конфликтные записи (см. clearOutbox).
 */
export const pushChanges = async (
  db: Database = defaultDb,
): Promise<SyncPushResult | null> => {
  const rows = await db
    .select()
    .from(syncOutbox)
    .orderBy(asc(syncOutbox.id))
  if (rows.length === 0) return null

  const changes = (rows as SyncOutboxRow[]).map(toChange)
  const deviceUuid = await getOrCreateDeviceUuid(db)
  const deviceName = await getDeviceName(db)

  const result = await withBackoff(() =>
    syncApi.pushChanges(deviceUuid, deviceName, changes),
  )

  const conflictUuids = result.conflicts.map((c) => c.entity_uuid)
  await clearOutbox(db, [...result.applied, ...conflictUuids])
  return result
}
