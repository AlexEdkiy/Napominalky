import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Служебное key-value хранилище состояния синхронизации.
 * Ключи: `last_pulled_revision`, `last_synced_at`.
 */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type SyncMetaRow = typeof syncMeta.$inferSelect
export type NewSyncMetaRow = typeof syncMeta.$inferInsert
