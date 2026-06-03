import type { Database } from '../client'
import { syncOutbox, type SyncOperation } from '../schema/syncOutbox'

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
export const enqueueOutbox = async (
  db: Database,
  entry: OutboxEntry,
): Promise<void> => {
  await db.insert(syncOutbox).values({
    entityType: entry.entityType,
    entityUuid: entry.entityUuid,
    operation: entry.operation,
    payload: JSON.stringify(entry.payload),
    updatedAt: entry.updatedAt,
  })
}
