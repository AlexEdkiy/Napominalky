jest.mock('../../client', () => ({ db: {} }))

import { eq } from 'drizzle-orm'
import { createSqliteTestDb } from '../../testing/sqlite'
import { notes, shoppingLists, shoppingListItems, shoppingListItemComments, reminders, syncMeta, syncOutbox } from '../../schema'
import { SearchRepository } from '../searchRepo'
import { NotesRepository } from '../notesRepo'
import { LAST_USER_ID } from '@/services/sync/syncMeta'
import type { SearchScope, SearchType } from '@/types/search'

let fixture: ReturnType<typeof createSqliteTestDb>
const updatedAt = '2026-10-02T10:00:00Z'
const guest = { userId: null, guest: true }
const search = (q: string, type: SearchType = 'all', page = 1, scope: SearchScope = guest) =>
  new SearchRepository(fixture.db).search(q, type, page, scope)
const note = (uuid: string, title: string, extra = {}) =>
  fixture.db.insert(notes).values({ uuid, title, updatedAt, ...extra }).run()
const list = (uuid: string, extra = {}) =>
  fixture.db.insert(shoppingLists).values({ uuid, title: 'Список', updatedAt, ...extra }).run()
const item = (uuid: string, shoppingListUuid: string, extra = {}) => fixture.db.insert(shoppingListItems)
  .values({ uuid, shoppingListUuid, name: 'Пункт', updatedAt, ...extra }).run()
const comment = (uuid: string, shoppingListItemUuid: string, extra = {}) => fixture.db.insert(shoppingListItemComments)
  .values({ uuid, shoppingListItemUuid, body: 'Молоко в комментарии', authorName: 'Тест', updatedAt, createdAt: updatedAt, ...extra }).run()

beforeEach(() => { fixture = createSqliteTestDb() })
afterEach(() => { fixture.close() })

it('finds Cyrillic title/body, list and item tags, legacy/thread comments and reminder text', () => {
  note('note-title', 'МОЛОКО')
  note('note-body', 'Заметка', { body: 'Купить молоко', isArchived: 1 })
  list('goods', { title: 'Молоко', isCompleted: 1 })
  list('task', { type: 'tasks', tags: '["Молоко"]' })
  item('named', 'task', { name: 'Молоко', isChecked: 1 })
  item('tagged', 'goods', { tags: '["молоко"]' })
  item('legacy', 'task', { comment: 'молоко на кухне' })
  item('thread', 'task')
  comment('comment-1', 'thread')
  comment('comment-2', 'thread', { createdAt: '2026-10-02T12:00:00Z', body: 'Ещё МОЛОКО' })
  fixture.db.insert(reminders).values({ uuid: 'reminder', title: 'Позвонить', notes: 'Молоко',
    updatedAt, remindAt: updatedAt, isCompleted: 1 }).run()
  const found = search(' молОко ')
  expect(found.total).toBe(9)
  expect(found.results.filter((r) => r.uuid === 'thread')).toEqual([expect.objectContaining({
    listUuid: 'task', matchInComments: true, excerpt: 'Ещё МОЛОКО', listType: 'tasks',
  })])
  expect(found.results.find((r) => r.uuid === 'tagged')?.excerpt).toBe('молоко')
  expect(found.results.find((r) => r.uuid === 'note-body')?.isArchived).toBe(true)
  expect(found.results.find((r) => r.uuid === 'reminder')?.isCompleted).toBe(true)
  expect(found.results.find((r) => r.uuid === 'named')?.isCompleted).toBe(true)
  expect(search('молоко', 'list').total).toBe(2)
})

it('excludes deleted rows, deleted/missing parents and deleted or foreign comments', () => {
  note('deleted-note', 'Молоко', { deletedAt: updatedAt })
  list('deleted-list', { title: 'Молоко', deletedAt: updatedAt })
  list('live-list')
  item('under-deleted', 'deleted-list', { name: 'Молоко' })
  item('orphan', 'missing', { name: 'Молоко' })
  item('deleted-item', 'live-list', { name: 'Молоко', deletedAt: updatedAt })
  item('live-item', 'live-list')
  comment('deleted-comment', 'live-item', { deletedAt: updatedAt })
  comment('foreign-comment', 'live-item', { userId: 'someone-else' })
  comment('orphan-comment', 'missing')
  fixture.db.insert(reminders).values({ uuid: 'deleted-reminder', title: 'Молоко',
    remindAt: updatedAt, updatedAt, deletedAt: updatedAt }).run()
  expect(search('молоко').total).toBe(0)
})

it('isolates the local profile while retaining null-owner sync rows and unsynced guest data', () => {
  note('local', 'Молоко')
  note('own', 'Молоко', { userId: 'alice' })
  note('foreign', 'Молоко', { userId: 'bob' })
  list('foreign-parent', { userId: 'bob' })
  item('own-under-foreign', 'foreign-parent', { name: 'Молоко', userId: 'alice' })
  expect(search('молоко').results.map((r) => r.uuid)).toEqual(['local'])
  fixture.db.insert(syncMeta).values({ key: LAST_USER_ID, value: 'alice' }).run()
  expect(search('молоко', 'all', 1, { userId: 'alice', guest: false }).total).toBe(2)
  expect(search('молоко', 'all', 1, { userId: null, guest: false }).total).toBe(2)
  expect(search('молоко', 'all', 1, { userId: 'bob', guest: false }).total).toBe(0)
  expect(search('молоко').total).toBe(0)
})

it.each(['%_', '\\!', "' OR 1=1", '[.*]'])('matches %s literally', (literal) => {
  note('match', `Содержит ${literal}`)
  note('other', 'Другой текст')
  expect(search(literal).results.map((r) => r.uuid)).toEqual(['match'])
})

it('ranks title matches first, pages deterministically and clamps a page after removal', () => {
  note('body', 'Текст', { body: 'молоко', updatedAt: '2026-10-03T00:00:00Z' })
  for (let i = 0; i < 24; i++) note(`note-${String(i).padStart(2, '0')}`, 'Молоко')
  const first = search('молоко')
  const second = search('молоко', 'all', 2)
  expect(first.results).toHaveLength(20)
  expect(second.results).toHaveLength(5)
  expect(first.total).toBe(25)
  expect(second.results.at(-1)?.uuid).toBe('body')
  expect(new Set([...first.results, ...second.results].map((r) => r.uuid)).size).toBe(25)
  fixture.db.delete(notes).where(eq(notes.uuid, 'body')).run()
  expect(search('молоко', 'all', 99).page).toBe(2)
  expect(search('молоко', 'reminder', 99).page).toBe(1)
})

it('produces a short matching excerpt and ignores empty/invalid queries', () => {
  note('long', 'Длинная', { body: `${'До '.repeat(200)}Молоко${' после'.repeat(200)}` })
  const text = search('молоко').results[0]?.excerpt ?? ''
  expect(text).toContain('Молоко')
  expect(text.startsWith('…')).toBe(true)
  expect(text.length).toBeLessThanOrEqual(240)
  for (const query of ['', ' ', 'м', 'м'.repeat(201)]) expect(search(query).total).toBe(0)
})

it('finds offline edits immediately and never modifies records, cursor or outbox', async () => {
  const repo = new NotesRepository(fixture.db)
  const created = await repo.createNote({ title: 'Молоко из черновика' })
  const before = fixture.sqlite.prepare('SELECT * FROM sync_outbox').all()
  expect(search('молоко').results[0]?.uuid).toBe(created.uuid)
  expect(fixture.sqlite.prepare('SELECT * FROM sync_outbox').all()).toEqual(before)
  await repo.updateNote(created.uuid, { body: 'Новый текст' })
  expect(search('новый текст').total).toBe(1)
  await repo.deleteNote(created.uuid)
  const queued = fixture.db.select().from(syncOutbox).all()
  expect(search('молоко').total).toBe(0)
  expect(fixture.db.select().from(syncOutbox).all()).toEqual(queued)
  expect(fixture.db.select().from(syncMeta).all()).toEqual([])
})
