import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Очередь исходящих мутаций (outbox) для двусторонней синхронизации.
 * Любая локальная мутация доменной сущности добавляет сюда запись;
 * sync-движок (MOB-13) забирает их батчем, отправляет на сервер и очищает.
 */
export type SyncOperation = 'create' | 'update' | 'delete'

export const syncOutbox = sqliteTable('sync_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityUuid: text('entity_uuid').notNull(),
  operation: text('operation').$type<SyncOperation>().notNull(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export type SyncOutboxRow = typeof syncOutbox.$inferSelect
export type NewSyncOutboxRow = typeof syncOutbox.$inferInsert
