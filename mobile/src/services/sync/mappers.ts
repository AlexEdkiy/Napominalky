import { notes } from '@/db/schema/notes'
import { reminders } from '@/db/schema/reminders'
import { shoppingListItems } from '@/db/schema/shoppingListItems'
import { shoppingLists } from '@/db/schema/shoppingLists'
import type { SyncTable } from '@/db/repositories/baseRepo'
import type {
  ServerNote,
  ServerReminder,
  ServerShoppingList,
  ServerShoppingListItem,
} from '@/types/sync'

/** boolean → SQLite integer (1/0). */
const flag = (value: boolean): number => (value ? 1 : 0)

/**
 * Описывает применение одной серверной сущности: целевая таблица (как SyncTable
 * — с полями uuid/updatedAt/deletedAt) и функция, строящая строку для upsert
 * (booleans → 0/1, даты — ISO как есть, deleted_at сохраняется как tombstone).
 */
export interface EntityMapper<TServer extends { uuid: string; updated_at: string }> {
  table: SyncTable
  toRow: (server: TServer) => Record<string, unknown>
}

const noteMapper: EntityMapper<ServerNote> = {
  table: notes as unknown as SyncTable,
  toRow: (s) => ({
    uuid: s.uuid,
    title: s.title ?? '',
    body: s.body,
    color: s.color ?? null,
    isPinned: flag(s.is_pinned),
    isArchived: flag(s.is_archived),
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
    deletedAt: s.deleted_at,
  }),
}

const shoppingListMapper: EntityMapper<ServerShoppingList> = {
  table: shoppingLists as unknown as SyncTable,
  toRow: (s) => ({
    uuid: s.uuid,
    title: s.title ?? '',
    type: s.type ?? 'goods',
    tags: s.tags ?? null,
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
    deletedAt: s.deleted_at,
  }),
}

const shoppingListItemMapper: EntityMapper<ServerShoppingListItem> = {
  table: shoppingListItems as unknown as SyncTable,
  toRow: (s) => ({
    uuid: s.uuid,
    shoppingListUuid: s.shopping_list_uuid,
    name: s.name ?? '',
    category: s.category ?? 'other',
    quantity: s.quantity ?? 1,
    deadline: s.deadline ?? null,
    reminderAt: s.reminder_at ?? null,
    link: s.link ?? null,
    comment: s.comment ?? null,
    tags: s.tags ?? null,
    isChecked: flag(s.is_checked),
    position: s.position ?? 0,
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
    deletedAt: s.deleted_at,
  }),
}

const reminderMapper: EntityMapper<ServerReminder> = {
  table: reminders as unknown as SyncTable,
  toRow: (s) => ({
    uuid: s.uuid,
    title: s.title ?? '',
    notes: s.notes,
    remindAt: s.remind_at ?? s.updated_at,
    recurrence: s.recurrence ?? 'none',
    isCompleted: flag(s.is_completed),
    completedAt: s.completed_at,
    snoozedUntil: s.snoozed_until,
    sourceUuid: s.source_uuid,
    sourceType: s.source_type,
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
    deletedAt: s.deleted_at,
  }),
}

export const mappers = {
  note: noteMapper,
  shopping_list: shoppingListMapper,
  shopping_list_item: shoppingListItemMapper,
  reminder: reminderMapper,
}
