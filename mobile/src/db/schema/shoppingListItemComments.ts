import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Локальная таблица комментариев-треда к пункту списка/задачи. Зеркалит
 * серверную sync-сущность shopping_list_item_comment: shopping_list_item_uuid
 * ссылается на пункт по публичному uuid (индекс для выборки треда),
 * author_name — снимок имени автора на момент создания, deleted_at — tombstone.
 * Тред ЗАМЕНЯЕТ одиночное поле comment пункта в UI (легаси-поле сохранено
 * в shopping_list_items для совместимости синка; серверный бэкфилл уже
 * превратил его в комментарии).
 */
export const shoppingListItemComments = sqliteTable(
  'shopping_list_item_comments',
  {
    uuid: text('uuid').primaryKey(),
    shoppingListItemUuid: text('shopping_list_item_uuid').notNull(),
    userId: text('user_id'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    serverRevision: integer('server_revision'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    itemIdx: index('shopping_list_item_comments_item_idx').on(
      table.shoppingListItemUuid,
    ),
  }),
)

export type ShoppingListItemCommentRow = typeof shoppingListItemComments.$inferSelect
export type NewShoppingListItemCommentRow = typeof shoppingListItemComments.$inferInsert
