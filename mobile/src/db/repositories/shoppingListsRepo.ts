import { and, asc, eq, isNull, like, max, min, sql } from 'drizzle-orm'
import { db as defaultDb, type Database } from '../client'
import {
  shoppingListItems,
  type ShoppingListItemRow,
} from '../schema/shoppingListItems'
import { shoppingLists, type ShoppingListRow } from '../schema/shoppingLists'
import { BaseRepository, type SyncTable } from './baseRepo'
import {
  cancelReminder,
  rescheduleItemReminder,
  scheduleItemReminder,
  type SchedulableListItem,
} from '../../services/notifications'

/** Категории элемента списка покупок (зеркало backend ShoppingListItem). */
export type ItemCategory = 'products' | 'household' | 'pharmacy' | 'other'

/** Тип списка: товары или задачи. */
export type ListType = 'goods' | 'tasks'

/** Доменный список покупок с рассчитанным прогрессом (checked/total). */
export interface ShoppingList {
  uuid: string
  userId: string | null
  title: string
  type: ListType
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
  quantity: number
  deadline: string | null
  reminderAt: string | null
  link: string | null
  comment: string | null
  tags: string | null
  isChecked: boolean
  position: number
  /** Локальный id запланированного уведомления (не синхронизируется). */
  notificationId: string | null
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/**
 * Парсит JSON-строку тегов в массив строк.
 * Некорректный JSON или null → пустой массив.
 */
export const parseTags = (tags: string | null): string[] => {
  if (tags === null) return []
  try {
    const parsed: unknown = JSON.parse(tags)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is string => typeof t === 'string')
  } catch {
    return []
  }
}

/**
 * Сериализует массив тегов в JSON-строку для хранения.
 * Пустой массив → null.
 */
export const serializeTags = (arr: string[]): string | null => {
  if (arr.length === 0) return null
  return JSON.stringify(arr)
}

/** Данные для создания списка (sync-поля проставит baseRepo). */
export interface CreateListData {
  title: string
  type?: ListType
  userId?: string | null
}

/** Частичное обновление доменных полей списка. */
export type UpdateListPatch = Partial<Pick<CreateListData, 'title' | 'type' | 'userId'>>

/** Данные для добавления элемента (position наследуется автоматически). */
export interface CreateItemData {
  name: string
  category?: ItemCategory
  quantity?: number
  deadline?: string | null
  reminderAt?: string | null
  link?: string | null
  comment?: string | null
  tags?: string | null
  isChecked?: boolean
  userId?: string | null
}

/** Частичное обновление доменных полей элемента. */
export type UpdateItemPatch = Partial<
  Pick<
    CreateItemData,
    | 'name'
    | 'category'
    | 'quantity'
    | 'deadline'
    | 'reminderAt'
    | 'link'
    | 'comment'
    | 'tags'
    | 'isChecked'
    | 'userId'
  >
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
  quantity: row.quantity,
  deadline: row.deadline ?? null,
  reminderAt: row.reminderAt ?? null,
  link: row.link ?? null,
  comment: row.comment ?? null,
  tags: row.tags ?? null,
  isChecked: bool(row.isChecked),
  position: row.position,
  notificationId: row.notificationId ?? null,
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
  type: (row.type as ListType) ?? 'goods',
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
  itemsCount,
  checkedItemsCount,
})

/** Строит объект для планировщика уведомлений из доменного пункта. */
const toSchedulableItem = (item: ShoppingListItem): SchedulableListItem => ({
  uuid: item.uuid,
  listUuid: item.shoppingListUuid,
  name: item.name,
  comment: item.comment,
  reminderAt: item.reminderAt ?? '',
})

/**
 * Репозиторий списков покупок поверх двух BaseRepository (списки и элементы):
 * мутации идут через base (доменная строка + запись в sync_outbox), чтения —
 * напрямую через db. is_checked хранится как 0/1, конвертируется в boolean на
 * чтении. Прогресс (checked/total) считается из активных элементов списка.
 * notification_id — ЛОКАЛЬНОЕ поле: не синхронизируется, не проходит outbox.
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
      type: data.type ?? 'goods',
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
    if (patch.type !== undefined) values.type = patch.type
    if (patch.userId !== undefined) values.userId = patch.userId

    const row = await this.lists.update(uuid, values as never)
    if (row === null) return null
    return this.withProgress(row as ShoppingListRow)
  }

  /** Мягкое удаление списка + tombstone всех его активных элементов. */
  public async deleteList(uuid: string): Promise<ShoppingList | null> {
    const children = await this.activeItemRows(uuid)
    for (const child of children) {
      await cancelReminder(child.notificationId ?? null)
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

  /** Активные списки (без tombstone) с прогрессом, по алфавиту. */
  public async listLists(): Promise<ShoppingList[]> {
    const rows = await this.db
      .select()
      .from(shoppingLists)
      .where(isNull(shoppingLists.deletedAt))
      .orderBy(asc(shoppingLists.title))

    return Promise.all(rows.map((row) => this.withProgress(row)))
  }

  // ---- Элементы -----------------------------------------------------------

  /** Добавляет элемент в конец списка (position = max+1). Если reminderAt в
   *  будущем — планирует локальное уведомление и сохраняет notificationId. */
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
      quantity: data.quantity ?? 1,
      deadline: data.deadline ?? null,
      reminderAt: data.reminderAt ?? null,
      link: data.link ?? null,
      comment: data.comment ?? null,
      tags: data.tags ?? null,
      isChecked: flag(data.isChecked ?? false),
      position,
    } as never)
    const item = toItem(row as ShoppingListItemRow)

    if (item.reminderAt !== null) {
      const nid = await scheduleItemReminder(toSchedulableItem(item))
      if (nid !== null) await this.setItemNotificationId(item.uuid, nid)
      return { ...item, notificationId: nid }
    }

    return item
  }

  public async updateItem(
    uuid: string,
    patch: UpdateItemPatch,
  ): Promise<ShoppingListItem | null> {
    const current = await this.items.findById(uuid)
    const oldNid = current !== null
      ? (current as ShoppingListItemRow).notificationId ?? null
      : null

    const values: Record<string, unknown> = {}
    if (patch.name !== undefined) values.name = patch.name
    if (patch.category !== undefined) values.category = patch.category
    if (patch.quantity !== undefined) values.quantity = patch.quantity
    if (patch.deadline !== undefined) values.deadline = patch.deadline
    if (patch.reminderAt !== undefined) values.reminderAt = patch.reminderAt
    if (patch.link !== undefined) values.link = patch.link
    if (patch.comment !== undefined) values.comment = patch.comment
    if (patch.tags !== undefined) values.tags = patch.tags
    if (patch.userId !== undefined) values.userId = patch.userId
    if (patch.position !== undefined) values.position = patch.position
    if (patch.isChecked !== undefined) values.isChecked = flag(patch.isChecked)

    const row = await this.items.update(uuid, values as never)
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)

    if (patch.reminderAt === undefined) return item

    if (patch.reminderAt === null) {
      await cancelReminder(oldNid)
      await this.setItemNotificationId(uuid, null)
      return { ...item, notificationId: null }
    }

    const nid = await rescheduleItemReminder(toSchedulableItem(item), oldNid)
    await this.setItemNotificationId(uuid, nid)
    return { ...item, notificationId: nid }
  }

  /** Мягкое удаление элемента: отменяет уведомление + tombstone + outbox. */
  public async deleteItem(uuid: string): Promise<ShoppingListItem | null> {
    const current = await this.items.findById(uuid)
    if (current !== null) {
      await cancelReminder((current as ShoppingListItemRow).notificationId ?? null)
    }
    const row = await this.items.softDelete(uuid)
    return row === null ? null : toItem(row as ShoppingListItemRow)
  }

  /**
   * Отмечает/снимает отметку пункта. При checked=true отменяет уведомление;
   * при checked=false перепланирует (если reminderAt в будущем).
   */
  public async checkItem(
    uuid: string,
    checked: boolean,
  ): Promise<ShoppingListItem | null> {
    const current = await this.items.findById(uuid)
    const oldNid = (current as ShoppingListItemRow | null)?.notificationId ?? null

    const row = await this.items.update(uuid, { isChecked: flag(checked) } as never)
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)

    if (checked) {
      await cancelReminder(oldNid)
      await this.setItemNotificationId(uuid, null)
      return { ...item, notificationId: null }
    }

    if (item.reminderAt !== null) {
      const nid = await rescheduleItemReminder(toSchedulableItem(item), oldNid)
      await this.setItemNotificationId(uuid, nid)
      return { ...item, notificationId: nid }
    }

    return item
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

  /** Активные (не удалённые tombstone) строки-элементы списка. */
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

  /**
   * Сохраняет локальный id уведомления пункта. Поле notification_id НЕ
   * синхронизируется — пишем напрямую в таблицу, минуя outbox.
   */
  public async setItemNotificationId(
    uuid: string,
    notificationId: string | null,
  ): Promise<ShoppingListItem | null> {
    const [row] = await this.db
      .update(shoppingListItems)
      .set({ notificationId } as never)
      .where(eq(shoppingListItems.uuid, uuid))
      .returning()
    return row === undefined ? null : toItem(row as ShoppingListItemRow)
  }

  /**
   * Сгруппированный запрос ближайших невыполненных дедлайнов для списков-задач.
   * Один SQL вместо N+1. Возвращает Map uuid → ISO-строка минимального дедлайна.
   */
  public async nearestDeadlines(): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        listUuid: shoppingListItems.shoppingListUuid,
        minDeadline: min(shoppingListItems.deadline),
      })
      .from(shoppingListItems)
      .where(
        and(
          isNull(shoppingListItems.deletedAt),
          sql`${shoppingListItems.isChecked} = 0`,
          sql`${shoppingListItems.deadline} IS NOT NULL`,
        ),
      )
      .groupBy(shoppingListItems.shoppingListUuid)

    const map = new Map<string, string>()
    for (const row of rows) {
      if (row.minDeadline !== null && row.minDeadline !== undefined) {
        map.set(row.listUuid, row.minDeadline)
      }
    }
    return map
  }
}

/** Singleton поверх дефолтного клиента для использования в хуках/сторах. */
export const shoppingListsRepo = new ShoppingListsRepository()
