import { normalizeTaskStatus, type TaskStatus } from '../../constants/taskStatus'
import type { ShoppingListItemRow } from '../schema/shoppingListItems'
import type { ShoppingListRow } from '../schema/shoppingLists'
import type { SchedulableListItem } from '../../services/notifications'

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
  /** Теги списка: JSON-строка массива (null = нет тегов). */
  tags: string | null
  /** Статус задачи (значим только для type='tasks'). */
  status: TaskStatus
  /** true = статус закреплён вручную, автодеривация из пунктов отключена. */
  statusIsManual: boolean
  /** Инвариант: true ⇔ status='done'. */
  isCompleted: boolean
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
  /** Статус пункта задачи. Инвариант: status='done' ⇔ isChecked. */
  status: TaskStatus
  position: number
  /** Локальный id запланированного уведомления (не синхронизируется). */
  notificationId: string | null
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Данные для создания списка (sync-поля проставит baseRepo). */
export interface CreateListData {
  title: string
  type?: ListType
  tags?: string | null
  userId?: string | null
}

/** Частичное обновление доменных полей списка. */
export type UpdateListPatch = Partial<Pick<CreateListData, 'title' | 'type' | 'tags' | 'userId'>>

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

export const bool = (value: number): boolean => value === 1
export const flag = (value: boolean): number => (value ? 1 : 0)

/** Строка SQLite → доменный элемент (0/1 → boolean, статус нормализуется). */
export const toItem = (row: ShoppingListItemRow): ShoppingListItem => ({
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
  status: normalizeTaskStatus(row.status),
  position: row.position,
  notificationId: row.notificationId ?? null,
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})

/** Строка SQLite + прогресс → доменный список. */
export const toList = (
  row: ShoppingListRow,
  itemsCount: number,
  checkedItemsCount: number,
): ShoppingList => ({
  uuid: row.uuid,
  userId: row.userId,
  title: row.title,
  type: (row.type as ListType) ?? 'goods',
  tags: row.tags ?? null,
  status: normalizeTaskStatus(row.status),
  statusIsManual: bool(row.statusIsManual ?? 0),
  isCompleted: bool(row.isCompleted ?? 0),
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
  itemsCount,
  checkedItemsCount,
})

/** Строит объект для планировщика уведомлений из доменного пункта. */
export const toSchedulableItem = (item: ShoppingListItem): SchedulableListItem => ({
  uuid: item.uuid,
  listUuid: item.shoppingListUuid,
  name: item.name,
  comment: item.comment,
  reminderAt: item.reminderAt ?? '',
})
