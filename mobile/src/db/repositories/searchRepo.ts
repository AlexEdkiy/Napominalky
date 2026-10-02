import { and, eq, isNull, or } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'

import type { Database } from '../client'
import { notes, reminders, shoppingLists, shoppingListItems, shoppingListItemComments, syncMeta } from '../schema'
import { LAST_USER_ID } from '@/services/sync/syncMeta'
import type { SearchPage, SearchResult, SearchScope, SearchType } from '@/types/search'

const PAGE_SIZE = 20
const emptyPage = (): SearchPage => ({ results: [], total: 0, page: 1, lastPage: 1 })
const readableTags = (text: string | null): string => {
  if (!text) return ''
  try {
    const tags: unknown = JSON.parse(text)
    if (Array.isArray(tags) && tags.every((tag: unknown) => typeof tag === 'string')) return tags.join(', ')
  } catch { /* Legacy plain-text tags remain searchable. */ }
  return text
}
const excerpt = (text: string, query: string): string => {
  const clean = text.replace(/\s+/gu, ' ')
  const start = Math.max(0, clean.toLowerCase().indexOf(query) - 60)
  return `${start ? '…' : ''}${clean.slice(start, start + 236)}${clean.length > start + 236 ? '…' : ''}`
}
const owned = (userId: SQLiteColumn, deletedAt: SQLiteColumn, owner: string | null) =>
  and(isNull(deletedAt), owner === null ? isNull(userId) : or(isNull(userId), eq(userId, owner)))

/** Read-only search over the current local profile, including unsynced changes.
 * JS matching is intentional: stock SQLite LIKE/lower is not Cyrillic case-insensitive.
 */
export class SearchRepository {
  public constructor(private readonly db: Database) {}

  public search(text: string, type: SearchType, requestedPage: number, scope: SearchScope): SearchPage {
    const query = text.trim().toLowerCase()
    if (Array.from(query).length < 2 || Array.from(query).length > 200) return emptyPage()
    const lastUser = this.db.select().from(syncMeta).where(eq(syncMeta.key, LAST_USER_ID)).get()?.value ?? null
    if ((scope.guest && lastUser !== null) || (scope.userId && lastUser && scope.userId !== lastUser)) {
      return emptyPage()
    }
    const owner = scope.guest ? null : scope.userId ?? lastUser
    const matches = (value: string | null): boolean => value?.toLowerCase().includes(query) ?? false
    const results: SearchResult[] = []
    const add = (result: SearchResult, fields: string[]): void => {
      if (!matches(result.title) && !fields.some(matches)) return
      const content = fields.find(matches) ?? fields.find(Boolean) ?? ''
      results.push({ ...result, excerpt: excerpt(content, query) })
    }
    const base = { excerpt: '', listUuid: null, listTitle: null, listType: null,
      isCompleted: false, isArchived: false, matchInComments: false }

    if (type === 'all' || type === 'note') {
      for (const row of this.db.select().from(notes).where(owned(notes.userId, notes.deletedAt, owner)).all()) {
        add({ ...base, type: 'note', uuid: row.uuid, title: row.title, updatedAt: row.updatedAt,
          isArchived: row.isArchived === 1 }, [row.body ?? ''])
      }
    }
    if (type === 'all' || type === 'reminder') {
      const table = reminders
      for (const row of this.db.select().from(table).where(owned(table.userId, table.deletedAt, owner)).all()) {
        add({ ...base, type: 'reminder', uuid: row.uuid, title: row.title, updatedAt: row.updatedAt,
          isCompleted: row.isCompleted === 1 }, [row.notes ?? ''])
      }
    }
    if (type === 'all' || type === 'list' || type === 'item') {
      const table = shoppingLists
      const lists = this.db.select().from(table).where(owned(table.userId, table.deletedAt, owner)).all()
      const parents = new Map(lists.map((list) => [list.uuid, list]))
      if (type !== 'item') {
        for (const row of lists) add({ ...base, type: 'list', uuid: row.uuid, title: row.title,
          updatedAt: row.updatedAt, listType: row.type, isCompleted: row.isCompleted === 1 }, [readableTags(row.tags)])
      }
      if (type !== 'list') {
        const comments = this.matchingComments(owner, matches)
        const table = shoppingListItems
        const items = this.db.select().from(table).where(owned(table.userId, table.deletedAt, owner)).all()
        for (const row of items) {
          const parent = parents.get(row.shoppingListUuid)
          if (!parent) continue
          const comment = comments.get(row.uuid)
          add({ ...base, type: 'item', uuid: row.uuid, title: row.name, updatedAt: row.updatedAt,
            listUuid: parent.uuid, listTitle: parent.title, listType: parent.type,
            isCompleted: row.isChecked === 1, matchInComments: comment !== undefined },
          [comment ?? '', row.comment ?? '', readableTags(row.tags)])
        }
      }
    }
    results.sort((a, b) => Number(matches(b.title)) - Number(matches(a.title))
      || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
      || a.type.localeCompare(b.type) || a.uuid.localeCompare(b.uuid))
    const lastPage = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
    const page = Math.min(lastPage, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1))
    return { results: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: results.length, page, lastPage }
  }

  private matchingComments(owner: string | null, matches: (value: string | null) => boolean): Map<string, string> {
    const table = shoppingListItemComments
    const rows = this.db.select().from(table).where(owned(table.userId, table.deletedAt, owner)).all()
    // Newest matching comment supplies the excerpt; one result per item.
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.uuid.localeCompare(a.uuid))
    const found = new Map<string, string>()
    for (const row of rows) {
      if (!found.has(row.shoppingListItemUuid) && matches(row.body)) found.set(row.shoppingListItemUuid, row.body)
    }
    return found
  }
}
