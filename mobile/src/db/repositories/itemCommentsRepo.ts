import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'

import { useAuthStore } from '@/stores/authStore'
import { db as defaultDb, type Database } from '../client'
import {
  shoppingListItemComments,
  type ShoppingListItemCommentRow,
} from '../schema/shoppingListItemComments'
import { BaseRepository, type SyncTable } from './baseRepo'

/** Доменный комментарий треда пункта (зеркало строки SQLite). */
export interface ShoppingListItemComment {
  uuid: string
  shoppingListItemUuid: string
  userId: string | null
  authorName: string
  body: string
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Строка SQLite → доменный комментарий. */
export const toComment = (
  row: ShoppingListItemCommentRow,
): ShoppingListItemComment => ({
  uuid: row.uuid,
  shoppingListItemUuid: row.shoppingListItemUuid,
  userId: row.userId ?? null,
  authorName: row.authorName,
  body: row.body,
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})

/**
 * Имя автора нового комментария: имя текущего пользователя из authStore,
 * фолбэк — email, для гостя без профиля — «Вы».
 */
export const resolveAuthorName = (): string => {
  const { user } = useAuthStore.getState()
  const name = user?.name?.trim() ?? ''
  if (name.length > 0) return name
  const email = user?.email?.trim() ?? ''
  if (email.length > 0) return email
  return 'Вы'
}

/**
 * Репозиторий комментариев-треда к пунктам списков/задач. Мутации идут через
 * BaseRepository (доменная строка + запись в sync_outbox с entity_type
 * 'shopping_list_item_comment' и полным snake_case-снимком: payload содержит
 * shopping_list_item_uuid/author_name/body). Чтения — напрямую через db.
 * FIFO outbox гарантирует: пункт (созданный раньше) пушится раньше комментария.
 */
export class ItemCommentsRepository {
  private readonly comments: BaseRepository<
    typeof shoppingListItemComments & SyncTable
  >

  public constructor(private readonly db: Database = defaultDb) {
    this.comments = new BaseRepository(
      shoppingListItemComments as typeof shoppingListItemComments & SyncTable,
      'shopping_list_item_comment',
      db,
    )
  }

  /** Активные (не удалённые) комментарии пункта, ASC по created_at (тред). */
  public async listComments(
    itemUuid: string,
  ): Promise<ShoppingListItemComment[]> {
    const rows = await this.db
      .select()
      .from(shoppingListItemComments)
      .where(
        and(
          eq(shoppingListItemComments.shoppingListItemUuid, itemUuid),
          isNull(shoppingListItemComments.deletedAt),
        ),
      )
      .orderBy(asc(shoppingListItemComments.createdAt))
    return rows.map(toComment)
  }

  /**
   * Добавляет комментарий в тред пункта. author_name = имя текущего
   * пользователя (authStore), created_at = now ISO, uuid v4 и updated_at
   * генерирует BaseRepository (→ outbox → push на сервер).
   */
  public async addComment(
    itemUuid: string,
    body: string,
  ): Promise<ShoppingListItemComment> {
    const { user } = useAuthStore.getState()
    const row = await this.comments.insert({
      shoppingListItemUuid: itemUuid,
      userId: user?.uuid ?? null,
      authorName: resolveAuthorName(),
      body,
      createdAt: new Date().toISOString(),
    } as never)
    return toComment(row as ShoppingListItemCommentRow)
  }

  /** Мягкое удаление комментария (tombstone + outbox delete). */
  public async deleteComment(
    uuid: string,
  ): Promise<ShoppingListItemComment | null> {
    const row = await this.comments.softDelete(uuid)
    if (row === null) return null
    return toComment(row as ShoppingListItemCommentRow)
  }

  /**
   * Счётчики комментариев для набора пунктов одним SQL (для бейджа 💬 в строке).
   * Возвращает Map uuid пункта → количество активных комментариев (пункты без
   * комментариев в Map отсутствуют).
   */
  public async countsForItems(
    itemUuids: readonly string[],
  ): Promise<Map<string, number>> {
    if (itemUuids.length === 0) return new Map()
    const rows = await this.db
      .select({
        itemUuid: shoppingListItemComments.shoppingListItemUuid,
        total: count(shoppingListItemComments.uuid),
      })
      .from(shoppingListItemComments)
      .where(
        and(
          inArray(shoppingListItemComments.shoppingListItemUuid, [...itemUuids]),
          isNull(shoppingListItemComments.deletedAt),
        ),
      )
      .groupBy(shoppingListItemComments.shoppingListItemUuid)

    const map = new Map<string, number>()
    for (const row of rows) {
      map.set(row.itemUuid, Number(row.total))
    }
    return map
  }
}

/** Singleton поверх дефолтного клиента для использования в хуках. */
export const itemCommentsRepo = new ItemCommentsRepository()
