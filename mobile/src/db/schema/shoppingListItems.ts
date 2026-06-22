import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Локальная таблица элементов списка покупок. Зеркалит backend
 * ShoppingListItemResource (snake_case) и добавляет sync-поля. uuid —
 * первичный ключ; shopping_list_uuid ссылается на родительский список по uuid
 * (индекс для выборки элементов списка). is_checked хранится как integer 0/1
 * (SQLite boolean), category — строка из набора products/household/pharmacy/
 * other, position задаёт порядок, deleted_at — tombstone.
 */
export const shoppingListItems = sqliteTable(
  'shopping_list_items',
  {
    uuid: text('uuid').primaryKey(),
    shoppingListUuid: text('shopping_list_uuid').notNull(),
    userId: text('user_id'),
    name: text('name').notNull(),
    category: text('category').notNull().default('other'),
    quantity: integer('quantity').notNull().default(1),
    deadline: text('deadline'),
    reminderAt: text('reminder_at'),
    link: text('link'),
    comment: text('comment'),
    tags: text('tags'),
    isChecked: integer('is_checked').notNull().default(0),
    position: integer('position').notNull().default(0),
    serverRevision: integer('server_revision'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    listIdx: index('shopping_list_items_list_idx').on(table.shoppingListUuid),
  }),
)

export type ShoppingListItemRow = typeof shoppingListItems.$inferSelect
export type NewShoppingListItemRow = typeof shoppingListItems.$inferInsert
