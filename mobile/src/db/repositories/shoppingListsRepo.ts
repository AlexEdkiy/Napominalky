import { and, asc, eq, isNull, like, max } from 'drizzle-orm'
import { db as defaultDb, type Database } from '../client'
import {
  shoppingListItems,
  type ShoppingListItemRow,
} from '../schema/shoppingListItems'
import { shoppingLists, type ShoppingListRow } from '../schema/shoppingLists'
import { BaseRepository, type SyncTable } from './baseRepo'

/** Категории элемента списка покупок (зеркало backend ShoppingListItem). */
export type ItemCategory = 'products' | 'household' | 'pharmacy' | 'other'

/** Доменный список покупок с рассчитанным прогрессом (checked/total). */
export interface ShoppingList {
  uuid: string
  userId: string | null
  title: string
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  itemsCount: number
  checkedItemsCount: number
}

/** Доменный элемент списка: boolean is_checked вместо 0/1. */
export interface ShoppingListItem {
  uuid: string
  shoppingListUuid: string
  userId: string | null
  name: string
  category: ItemCategory
  isChecked: boolean
  position: number
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Данные для создания списка (sync-поля проставит baseRepo). */
export interface CreateListData {
  title: string
  userId?: string | null
}

/** Частичное обновление доменных полей списка. */
export type UpdateListPatch = Partial<CreateListData>

/** Данные для добавления элемента (position наследуется автоматически). */
export interface CreateItemData {
  name: string
  category?: ItemCategory
  isChecked?: boolean
  userId?: string | null
}

/** Частичное обновление доменных полей элемента. */
export type UpdateItemPatch = Partial<
  Pick<CreateItemData, 'name' | 'category' | 'isChecked' | 'userId'>
> & { position?: number }

interface ListItemsOptions {
  category?: ItemCategory
}

const bool = (value: number): boolean => value === 1
const flag = (value: boolean): number => (value ? 1 : 0)

const toItem = (row: ShoppingListItemRow): ShoppingListItem => ({
  uuid: row.uuid,
  shoppingListUuid: row.shoppingListUuid,
  userId: row.userId,
  name: row.name,
  category: row.category as ItemCategory,
  isChecked: bool(row.isChecked),
  position: row.position,
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})

const toList = (
  row: ShoppingListRow,
  itemsCount: number,
  checkedItemsCount: number,
): ShoppingList => ({
  uuid: row.uuid,
  userId: row.userId,
  title: row.title,
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
  itemsCount,
  checkedItemsCount,
})

/**
 * Репозиторий списков покупок поверх двух BaseRepository (списки и элементы):
 * мутации идут через base (доменная строка + запись в sync_outbox), чтения —
 * напрямую через db. is_checked хранится как 0/1, конвертируется в boolean на
 * чтении. Прогресс (checked/total) считается из активных элементов списка.
 */
export class ShoppingListsRepository {
  private readonly lists: BaseRepository<typeof shoppingLists & SyncTable>
  private readonly items: BaseRepository<typeof shoppingListItems & SyncTable>

  public constructor(private readonly db: Database = defaultDb) {
    this.lists = new BaseRepository(
      shoppingLists as typeof shoppingLists & SyncTable,
      'shopping_list',
      db,
    )
    this.items = new BaseRepository(
      shoppingListItems as typeof shoppingListItems & SyncTable,
      'shopping_list_item',
      db,
    )
  }

  // ---- Списки -------------------------------------------------------------

  public async createList(data: CreateListData): Promise<ShoppingList> {
    const row = await this.lists.insert({
      title: data.title,
      userId: data.userId ?? null,
    } as never)
    return toList(row as ShoppingListRow, 0, 0)
  }

  public async updateList(
    uuid: string,
    patch: UpdateListPatch,
  ): Promise<ShoppingList | null> {
    const values: Record<string, unknown> = {}
    if (patch.title !== undefined) values.title = patch.title
    if (patch.userId !== undefined) values.userId = patch.userId

    const row = await this.lists.update(uuid, values as never)
    if (row === null) return null
    return this.withProgress(row as ShoppingListRow)
  }

  /** Мягкое удаление списка + tombstone всех его активных элементов. */
  public async deleteList(uuid: string): Promise<ShoppingList | null> {
    const children = await this.activeItemRows(uuid)
    for (const child of children) {
      await this.items.softDelete(child.uuid)
    }

    const row = await this.lists.softDelete(uuid)
    if (row === null) return null
    return toList(row as ShoppingListRow, 0, 0)
  }

  public async getListByUuid(uuid: string): Promise<ShoppingList | null> {
    const row = await this.lists.findById(uuid)
    if (row === null) return null
    return this.withProgress(row as ShoppingListRow)
  }

  /** Активные списки (без tombstone) с прогрессом, новые сверху. */
  public async listLists(): Promise<ShoppingList[]> {
    const rows = await this.db
      .select()
      .from(shoppingLists)
      .where(isNull(shoppingLists.deletedAt))
      .orderBy(asc(shoppingLists.title))

    return Promise.all(rows.map((row) => this.withProgress(row)))
  }

  // ---- Элементы -----------------------------------------------------------

  /** Добавляет элемент в конец списка (position = max+1), наследуя user_id. */
  public async addItem(
    listUuid: string,
    data: CreateItemData,
  ): Promise<ShoppingListItem> {
    const position = await this.nextPosition(listUuid)
    const userId = data.userId ?? (await this.listUserId(listUuid))

    const row = await this.items.insert({
      shoppingListUuid: listUuid,
      userId,
      name: data.name,
      category: data.category ?? 'other',
      isChecked: flag(data.isChecked ?? false),
      position,
    } as never)
    return toItem(row as ShoppingListItemRow)
  }

  public async updateItem(
    uuid: string,
    patch: UpdateItemPatch,
  ): Promise<ShoppingListItem | null> {
    const values: Record<string, unknown> = {}
    if (patch.name !== undefined) values.name = patch.name
    if (patch.category !== undefined) values.category = patch.category
    if (patch.userId !== undefined) values.userId = patch.userId
    if (patch.position !== undefined) values.position = patch.position
    if (patch.isChecked !== undefined) values.isChecked = flag(patch.isChecked)

    const row = await this.items.update(uuid, values as never)
    return row === null ? null : toItem(row as ShoppingListItemRow)
  }

  /** Мягкое удаление элемента: tombstone (deleted_at) + delete в outbox. */
  public async deleteItem(uuid: string): Promise<ShoppingListItem | null> {
    const row = await this.items.softDelete(uuid)
    return row === null ? null : toItem(row as ShoppingListItemRow)
  }

  public async checkItem(
    uuid: string,
    checked: boolean,
  ): Promise<ShoppingListItem | null> {
    return this.updateItem(uuid, { isChecked: checked })
  }

  /** Активные элементы списка по position; опц. фильтр по категории. */
  public async listItems(
    listUuid: string,
    opts: ListItemsOptions = {},
  ): Promise<ShoppingListItem[]> {
    const filters = [
      eq(shoppingListItems.shoppingListUuid, listUuid),
      isNull(shoppingListItems.deletedAt),
    ]
    if (opts.category !== undefined) {
      filters.push(eq(shoppingListItems.category, opts.category))
    }

    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(and(...filters))
      .orderBy(asc(shoppingListItems.position))
    return rows.map(toItem)
  }

  /** Поиск элементов списка по name (LIKE), исключая удалённые. */
  public async searchItems(
    listUuid: string,
    query: string,
  ): Promise<ShoppingListItem[]> {
    const pattern = `%${query}%`
    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListUuid, listUuid),
          isNull(shoppingListItems.deletedAt),
          like(shoppingListItems.name, pattern),
        ),
      )
      .orderBy(asc(shoppingListItems.position))
    return rows.map(toItem)
  }

  // ---- Внутреннее ---------------------------------------------------------

  /** Дополняет строку списка прогрессом (total/checked) из элементов. */
  private async withProgress(row: ShoppingListRow): Promise<ShoppingList> {
    const rows = await this.activeItemRows(row.uuid)
    const checked = rows.filter((item) => item.isChecked === 1).length
    return toList(row, rows.length, checked)
  }

  /** Активные (не удалённые) строки-элементы списка. */
  private async activeItemRows(
    listUuid: string,
  ): Promise<ShoppingListItemRow[]> {
    return this.db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListUuid, listUuid),
          isNull(shoppingListItems.deletedAt),
        ),
      )
  }

  /** Следующая позиция = max(position активных) + 1, либо 0. */
  private async nextPosition(listUuid: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(shoppingListItems.position) })
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListUuid, listUuid),
          isNull(shoppingListItems.deletedAt),
        ),
      )
    const current = row?.value
    return current === null || current === undefined ? 0 : current + 1
  }

  /** user_id родительского списка для наследования элементами. */
  private async listUserId(listUuid: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: shoppingLists.userId })
      .from(shoppingLists)
      .where(eq(shoppingLists.uuid, listUuid))
      .limit(1)
    return row?.userId ?? null
  }
}

/** Singleton поверх дефолтного клиента для использования в хуках/сторах. */
export const shoppingListsRepo = new ShoppingListsRepository()
