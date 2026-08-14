import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Локальная таблица списков покупок. Зеркалит backend ShoppingListResource
 * (snake_case) и добавляет sync-поля. uuid — первичный ключ (baseRepo.findById
 * ищет по нему). server_revision приходит с сервера при pull, deleted_at —
 * tombstone. Прогресс (items_count/checked_items_count) считается из
 * shopping_list_items, а не хранится здесь.
 */
export const shoppingLists = sqliteTable('shopping_lists', {
  uuid: text('uuid').primaryKey(),
  userId: text('user_id'),
  title: text('title').notNull(),
  type: text('type').notNull().default('goods'),
  /** Теги списка: JSON-массив строк (nullable). Синхронизируется с backend. */
  tags: text('tags'),
  /** Статус задачи: new|in_progress|postponed|done. Только для type=tasks. */
  status: text('status').notNull().default('new'),
  /** 1 = статус закреплён вручную (автодеривация из пунктов отключена). */
  statusIsManual: integer('status_is_manual').notNull().default(0),
  /** Инвариант: 1 ⇔ status='done' (зеркало backend is_completed). */
  isCompleted: integer('is_completed').notNull().default(0),
  serverRevision: integer('server_revision'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

export type ShoppingListRow = typeof shoppingLists.$inferSelect
export type NewShoppingListRow = typeof shoppingLists.$inferInsert
