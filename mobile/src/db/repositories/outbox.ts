import type { Database } from '../client'
import { syncOutbox, type SyncOperation } from '../schema/syncOutbox'

/** Database or transaction: enqueue must use the same writer as the domain change. */
export type OutboxWriter = Pick<Database, 'insert'>

export interface OutboxEntry {
  entityType: string
  entityUuid: string
  operation: SyncOperation
  /** Снимок сущности в API-форме (snake_case), сериализуется в JSON. */
  payload: Record<string, unknown>
  updatedAt: string
}

/**
 * Записывает мутацию в очередь синхронизации (sync_outbox).
 * Вызывается из baseRepo внутри той же транзакции, что и доменная запись.
 */
export const enqueueOutbox = (
  db: OutboxWriter,
  entry: OutboxEntry,
): void => {
  db.insert(syncOutbox).values({
    entityType: entry.entityType,
    entityUuid: entry.entityUuid,
    operation: entry.operation,
    payload: JSON.stringify(entry.payload),
    updatedAt: entry.updatedAt,
  }).run()
}
