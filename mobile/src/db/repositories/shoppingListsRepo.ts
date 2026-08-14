import { and, asc, eq, isNull, like, max, min, sql } from 'drizzle-orm'
import { forChecked, isDone, normalizeTaskStatus, type TaskStatus } from '../../constants/taskStatus'
import { deriveListStatus } from '../../utils/deriveListStatus'
import { db as defaultDb, type Database } from '../client'
import { shoppingListItems, type ShoppingListItemRow } from '../schema/shoppingListItems'
import { shoppingLists, type ShoppingListRow } from '../schema/shoppingLists'
import { BaseRepository, type SyncTable } from './baseRepo'
import {
  bool, flag, toItem, toList, toSchedulableItem,
  type CreateItemData, type CreateListData, type ItemCategory, type ListType,
  type ShoppingList, type ShoppingListItem, type UpdateItemPatch, type UpdateListPatch,
} from './shoppingListsModels'
import { cancelReminder, rescheduleItemReminder, scheduleItemReminder } from '../../services/notifications'

// Модели/хелперы вынесены в shoppingListsModels; реэкспорт сохраняет публичный API.
export {
  parseTags, serializeTags,
  type CreateItemData, type CreateListData, type ItemCategory, type ListType,
  type ShoppingList, type ShoppingListItem, type UpdateItemPatch, type UpdateListPatch,
} from './shoppingListsModels'

interface ListItemsOptions {
  category?: ItemCategory
}

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
      tags: data.tags ?? null,
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
    if (patch.tags !== undefined) values.tags = patch.tags
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

  /**
   * Ручная смена статуса задачи: статус ЗАКРЕПЛЯЕТСЯ (statusIsManual=true),
   * автодеривация из пунктов больше его не трогает. Инвариант: isCompleted ⇔
   * status='done'. Для goods статус не имеет смысла — не вызывается из UI.
   */
  public async setListStatus(
    uuid: string,
    status: TaskStatus,
  ): Promise<ShoppingList | null> {
    const row = await this.lists.update(uuid, {
      status,
      statusIsManual: 1,
      isCompleted: flag(isDone(status)),
    } as never)
    if (row === null) return null
    return this.withProgress(row as ShoppingListRow)
  }

  /**
   * Сброс ручного статуса («Авто»): statusIsManual=false + немедленный
   * пересчёт статуса из статусов активных пунктов (deriveListStatus).
   */
  public async setListStatusAuto(uuid: string): Promise<ShoppingList | null> {
    const items = await this.activeItemRows(uuid)
    const derived = deriveListStatus(items.map((r) => normalizeTaskStatus(r.status)))
    const row = await this.lists.update(uuid, {
      status: derived,
      statusIsManual: 0,
      isCompleted: flag(isDone(derived)),
    } as never)
    if (row === null) return null
    return this.withProgress(row as ShoppingListRow)
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
      status: forChecked(data.isChecked ?? false, 'new'),
      position,
    } as never)
    const item = toItem(row as ShoppingListItemRow)
    await this.recalcListStatus(listUuid)

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
    if (patch.isChecked !== undefined) {
      values.isChecked = flag(patch.isChecked)
      // Инвариант status ⇔ is_checked: чекбокс двигает статус (done/new).
      const currentStatus = normalizeTaskStatus(
        (current as ShoppingListItemRow | null)?.status,
      )
      values.status = forChecked(patch.isChecked, currentStatus)
    }

    const row = await this.items.update(uuid, values as never)
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)
    if (patch.isChecked !== undefined) {
      await this.recalcListStatus(item.shoppingListUuid)
    }

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
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)
    await this.recalcListStatus(item.shoppingListUuid)
    return item
  }

  /**
   * Отмечает/снимает отметку пункта, поддерживая инвариант status ⇔ is_checked
   * (checked → done; uncheck сбрасывает done в new, прочие статусы сохраняет).
   * После мутации пересчитывает статус родительской задачи (tasks, не manual).
   */
  public async checkItem(
    uuid: string,
    checked: boolean,
  ): Promise<ShoppingListItem | null> {
    const current = await this.items.findById(uuid)
    const currentRow = current as ShoppingListItemRow | null
    const oldNid = currentRow?.notificationId ?? null
    const status = forChecked(checked, normalizeTaskStatus(currentRow?.status))

    const row = await this.items.update(uuid, {
      isChecked: flag(checked),
      status,
    } as never)
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)
    await this.recalcListStatus(item.shoppingListUuid)
    return this.syncItemNotification(item, oldNid)
  }

  /**
   * Явная смена статуса пункта задачи. Поддерживает инвариант is_checked ⇔
   * status='done' (включая отмену/перепланирование локального уведомления) и
   * пересчитывает статус родительской задачи, если он не закреплён вручную.
   */
  public async setItemStatus(
    uuid: string,
    status: TaskStatus,
  ): Promise<ShoppingListItem | null> {
    const current = await this.items.findById(uuid)
    const oldNid = (current as ShoppingListItemRow | null)?.notificationId ?? null

    const row = await this.items.update(uuid, {
      status,
      isChecked: flag(isDone(status)),
    } as never)
    if (row === null) return null
    const item = toItem(row as ShoppingListItemRow)
    await this.recalcListStatus(item.shoppingListUuid)
    return this.syncItemNotification(item, oldNid)
  }

  /**
   * Побочные эффекты чекбокса для локального уведомления пункта: выполненный
   * пункт — отмена, невыполненный с reminderAt — перепланирование.
   */
  private async syncItemNotification(
    item: ShoppingListItem,
    oldNid: string | null,
  ): Promise<ShoppingListItem> {
    if (item.isChecked) {
      await cancelReminder(oldNid)
      await this.setItemNotificationId(item.uuid, null)
      return { ...item, notificationId: null }
    }

    if (item.reminderAt !== null) {
      const nid = await rescheduleItemReminder(toSchedulableItem(item), oldNid)
      await this.setItemNotificationId(item.uuid, nid)
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

  /**
   * Локальный пересчёт статуса родительской задачи из статусов активных
   * пунктов (мгновенный offline-UI; сервер пересчитывает то же при push).
   * Пропускается для goods и для задач с закреплённым вручную статусом.
   * Обновление идёт через baseRepo → outbox, чтобы новый статус ушёл на сервер.
   */
  private async recalcListStatus(listUuid: string): Promise<void> {
    const listRow = (await this.lists.findById(listUuid)) as ShoppingListRow | null
    if (listRow === null) return
    if (((listRow.type as ListType) ?? 'goods') !== 'tasks') return
    if (bool(listRow.statusIsManual ?? 0)) return

    const items = await this.activeItemRows(listUuid)
    const derived = deriveListStatus(items.map((r) => normalizeTaskStatus(r.status)))
    const unchanged =
      derived === normalizeTaskStatus(listRow.status) &&
      bool(listRow.isCompleted ?? 0) === isDone(derived)
    if (unchanged) return

    await this.lists.update(listUuid, {
      status: derived,
      isCompleted: flag(isDone(derived)),
    } as never)
  }

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
   * Переустанавливает локальные уведомления для всех активных (без tombstone),
   * невыполненных элементов с заданным reminderAt в будущем. Вызывается при
   * старте приложения (FR-27/28): после перезагрузки устройства/переустановки
   * приложения системные alarm могли быть потеряны — без этого прохода такие
   * напоминания никогда не сработают. Идемпотентна: старый notification_id
   * (если был) отменяется перед планированием нового.
   */
  public async rescheduleAllPendingItems(now: Date = new Date()): Promise<number> {
    const rows = await this.db
      .select()
      .from(shoppingListItems)
      .where(and(isNull(shoppingListItems.deletedAt), eq(shoppingListItems.isChecked, 0)))

    let rescheduledCount = 0
    for (const row of rows as ShoppingListItemRow[]) {
      const item = toItem(row)
      if (item.reminderAt === null) continue
      if (new Date(item.reminderAt).getTime() <= now.getTime()) continue

      const nid = await rescheduleItemReminder(toSchedulableItem(item), item.notificationId)
      await this.setItemNotificationId(item.uuid, nid)
      if (nid !== null) rescheduledCount += 1
    }
    return rescheduledCount
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
