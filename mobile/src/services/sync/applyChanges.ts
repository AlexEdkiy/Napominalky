import { eq, sql } from 'drizzle-orm'

import { db as defaultDb, type Database } from '@/db/client'
import { syncMeta } from '@/db/schema/syncMeta'
import type { SyncTable } from '@/db/repositories/baseRepo'
import type { SyncChangesResponse } from '@/types/sync'
import { type EntityMapper, mappers } from './mappers'

/** Ключ sync_meta, хранящий курсор последнего успешного pull. */
const LAST_PULLED_KEY = 'last_pulled_revision'

interface ServerRecord {
  uuid: string
  updated_at: string
}

/**
 * Минимальный контракт writer'а: и Database, и объект транзакции drizzle
 * предоставляют select/insert/update/transaction. Сужаем тип до нужных методов,
 * чтобы один и тот же код работал и вне, и внутри db.transaction.
 */
type Writer = Pick<Database, 'select' | 'insert' | 'update'>

/**
 * Применяет одну серверную запись по правилу LWW: если локальной нет или
 * серверный updated_at >= локального — upsert (включая tombstone через
 * deleted_at); иначе пропуск (клиент новее, его изменение уже в outbox).
 * Пишет НАПРЯМУЮ в доменную таблицу, минуя baseRepo/outbox.
 */
const applyRecord = async <TServer extends ServerRecord>(
  writer: Writer,
  mapper: EntityMapper<TServer>,
  server: TServer,
): Promise<void> => {
  const { table } = mapper
  const [existing] = await writer
    .select({ updatedAt: table.updatedAt })
    .from(table)
    .where(eq(table.uuid, server.uuid))
    .limit(1)

  const localUpdatedAt = (existing as { updatedAt: string } | undefined)?.updatedAt
  if (localUpdatedAt !== undefined && server.updated_at < localUpdatedAt) {
    return
  }

  const row = mapper.toRow(server)
  if (localUpdatedAt === undefined) {
    await writer.insert(table).values(row as never)
    return
  }
  await writer
    .update(table)
    .set(row as never)
    .where(eq(table.uuid, server.uuid))
}

/**
 * Применяет батч записей одной сущности best-effort: ошибка на одной записи
 * логируется и запись пропускается, остальные применяются.
 */
const applyBatch = async <TServer extends ServerRecord>(
  writer: Writer,
  mapper: EntityMapper<TServer>,
  entity: string,
  records: TServer[],
): Promise<void> => {
  for (const record of records) {
    try {
      await applyRecord(writer, mapper, record)
    } catch (err) {
      console.warn('[sync] skip record', entity, record.uuid, err)
    }
  }
}

/** Сохраняет курсор последнего pull в sync_meta (upsert по ключу). */
const saveCursor = async (writer: Writer, cursor: number): Promise<void> => {
  await writer
    .insert(syncMeta)
    .values({ key: LAST_PULLED_KEY, value: String(cursor) })
    .onConflictDoUpdate({
      target: syncMeta.key,
      set: { value: sql`excluded.value` },
    })
}

/**
 * Применяет все батчи best-effort и ВСЕГДА сдвигает курсор — даже если часть
 * записей пропущена. Пропущенные записи подтянутся при следующей полной
 * реконсиляции (resetPullCursor → pull от 0).
 */
const applyAll = async (
  writer: Writer,
  response: SyncChangesResponse,
): Promise<void> => {
  const { data, meta } = response
  await applyBatch(writer, mappers.note, 'note', data.notes)
  await applyBatch(writer, mappers.shopping_list, 'shopping_list', data.shopping_lists)
  await applyBatch(writer, mappers.shopping_list_item, 'shopping_list_item', data.shopping_list_items)
  await applyBatch(writer, mappers.reminder, 'reminder', data.reminders)
  await saveCursor(writer, meta.cursor)
}

/**
 * Применяет серверный ответ pull к локальной БД (LWW, tombstones) и сдвигает
 * курсор. Идемпотентна: повторный вызов того же ответа ничего не меняет (LWW
 * по updated_at). НЕ пишет в sync_outbox — это входящие, а не локальные мутации.
 *
 * Устойчива к «грязным» данным: каждая запись применяется независимо (best-effort),
 * ошибка одной записи не откатывает остальные и не стопорит курсор.
 */
export const applyChanges = async (
  response: SyncChangesResponse,
  db: Database = defaultDb,
): Promise<void> => {
  await applyAll(db, response)
}
