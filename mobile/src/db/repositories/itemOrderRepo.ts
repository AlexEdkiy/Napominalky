import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Database } from '../client'
import { shoppingLists, shoppingListItems } from '../schema'
import { activeRepository } from './activeRepository'
import { enqueueOutbox } from './outbox'
import { nextUpdatedAt } from './favoritesRepo'
import { toSnakeCaseKeys } from '../../utils/snakeCase'

export class ItemOrderRepository {
  public constructor(private readonly db: Database) {}

  public async incrementQuantity(listUuid: string, uuid: string): Promise<void> {
    this.db.transaction((tx) => {
      const parent = tx.select().from(shoppingLists)
        .where(and(eq(shoppingLists.uuid, listUuid), isNull(shoppingLists.deletedAt))).get()
      if (!parent || parent.type !== 'goods') return
      const item = tx.select().from(shoppingListItems).where(and(eq(shoppingListItems.uuid, uuid),
        eq(shoppingListItems.shoppingListUuid, listUuid), isNull(shoppingListItems.deletedAt))).get()
      if (!item || item.quantity >= 9999) return
      const updatedAt = nextUpdatedAt(item.updatedAt)
      const row = tx.update(shoppingListItems).set({ quantity: Math.max(1, item.quantity) + 1, updatedAt })
        .where(eq(shoppingListItems.uuid, uuid)).returning().get()
      if (row) enqueueOutbox(tx, { entityType: 'shopping_list_item', entityUuid: uuid,
        operation: 'update', updatedAt, payload: toSnakeCaseKeys(row) })
    })
  }

  /** Reorder one visible favorite group; hidden rows retain their slots.
   * Read and write synchronously in one transaction: no partial outbox or stale snapshots.
   */
  public async reorder(listUuid: string, orderedUuids: string[]): Promise<void> {
    if (orderedUuids.length < 2) return
    if (new Set(orderedUuids).size !== orderedUuids.length) throw new Error('Повторяющиеся пункты')
    this.db.transaction((tx) => {
      const parent = tx.select().from(shoppingLists)
        .where(and(eq(shoppingLists.uuid, listUuid), isNull(shoppingLists.deletedAt))).get()
      if (!parent) throw new Error('Список удалён')
      const rows = tx.select().from(shoppingListItems).where(and(
        eq(shoppingListItems.shoppingListUuid, listUuid), isNull(shoppingListItems.deletedAt)))
        .orderBy(asc(shoppingListItems.position), asc(shoppingListItems.uuid)).all()
      const byId = new Map(rows.map((row) => [row.uuid, row]))
      const group = byId.get(orderedUuids[0] ?? '')?.isFavorite
      if (orderedUuids.some((uuid) => !byId.has(uuid) || byId.get(uuid)?.isFavorite !== group)) {
        throw new Error('Список изменился. Повторите перемещение')
      }
      const moving = new Set(orderedUuids)
      let next = 0
      const reordered = rows.map((row) => moving.has(row.uuid) ? byId.get(orderedUuids[next++] ?? '')! : row)
      // Normalize ties from concurrent devices. UUID is the deterministic tie-breaker.
      reordered.forEach((row, position) => {
        if (row.position === position) return
        const updatedAt = nextUpdatedAt(row.updatedAt)
        const changed = tx.update(shoppingListItems).set({ position, updatedAt })
          .where(eq(shoppingListItems.uuid, row.uuid)).returning().get()
        if (changed) enqueueOutbox(tx, { entityType: 'shopping_list_item', entityUuid: row.uuid,
          operation: 'update', updatedAt, payload: toSnakeCaseKeys(changed) })
      })
    })
  }
}

export const itemOrderRepo = activeRepository((db) => new ItemOrderRepository(db))
