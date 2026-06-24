import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Локальная таблица заметок. Зеркалит backend NoteResource (snake_case)
 * и добавляет sync-поля. uuid — первичный ключ (baseRepo.findById ищет по
 * нему). is_pinned/is_archived хранятся как integer 0/1 (SQLite boolean),
 * server_revision приходит с сервера при pull, deleted_at — tombstone.
 * color — цветовая метка (hex: '#ea899a'|'#ffebb8'|'#91d177'|'#afdafc'|null).
 */
export const notes = sqliteTable('notes', {
  uuid: text('uuid').primaryKey(),
  userId: text('user_id'),
  title: text('title').notNull(),
  body: text('body'),
  color: text('color'),
  isPinned: integer('is_pinned').notNull().default(0),
  isArchived: integer('is_archived').notNull().default(0),
  serverRevision: integer('server_revision'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

export type NoteRow = typeof notes.$inferSelect
export type NewNoteRow = typeof notes.$inferInsert
