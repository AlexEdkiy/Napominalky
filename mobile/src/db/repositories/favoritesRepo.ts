import { and, eq, isNull, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { notes, reminders, shoppingLists, shoppingListItems } from '../schema'
import { activeRepository } from './activeRepository'
import { enqueueOutbox } from './outbox'
import { toSnakeCaseKeys } from '../../utils/snakeCase'

export type FavoriteEntity = 'note' | 'reminder' | 'shopping_list' | 'shopping_list_item'
const tables = { note: notes, reminder: reminders, shopping_list: shoppingLists, shopping_list_item: shoppingListItems }

/** Monotonic per row, including several edits within a millisecond. */
export const nextUpdatedAt = (previous: string): string =>
  new Date(Math.max(Date.now(), (Date.parse(previous) || 0) + 1)).toISOString()

export class FavoritesRepository {
  public constructor(private readonly db: Database) {}

  public async toggle(entity: FavoriteEntity, uuid: string): Promise<void> {
    const table = tables[entity]
    this.db.transaction((tx) => {
      const current = tx.select().from(table).where(and(eq(table.uuid, uuid), isNull(table.deletedAt))).get()
      if (!current) return
      if (entity === 'shopping_list_item' && 'shoppingListUuid' in current && typeof current.shoppingListUuid === 'string') {
        const parent = tx.select().from(shoppingLists)
          .where(and(eq(shoppingLists.uuid, current.shoppingListUuid), isNull(shoppingLists.deletedAt))).get()
        if (!parent) return
      }
      const updatedAt = nextUpdatedAt(current.updatedAt)
      const row = tx.update(table).set({ isFavorite: sql`1 - ${table.isFavorite}`, updatedAt })
        .where(eq(table.uuid, uuid)).returning().get()
      if (!row) return
      enqueueOutbox(tx, { entityType: entity, entityUuid: uuid, operation: 'update', updatedAt,
        payload: toSnakeCaseKeys(row) })
    })
  }
}

export const favoritesRepo = activeRepository((db) => new FavoritesRepository(db))
