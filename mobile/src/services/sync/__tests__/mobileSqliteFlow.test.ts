jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/api/syncApi', () => ({
  syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() },
}))

import { eq } from 'drizzle-orm'
import { syncApi } from '@/api/syncApi'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { NotesRepository } from '@/db/repositories/notesRepo'
import { ShoppingListsRepository } from '@/db/repositories/shoppingListsRepo'
import { ItemCommentsRepository } from '@/db/repositories/itemCommentsRepo'
import { RemindersRepository } from '@/db/repositories/remindersRepo'
import { notes, reminders, shoppingListItems, syncOutbox } from '@/db/schema'
import type { SyncChangesResponse } from '@/types/sync'
import { applyChanges } from '../applyChanges'
import { pullChanges } from '../pullChanges'
import { pushChanges } from '../pushChanges'
import { getLastPulledRevision } from '../syncMeta'

const getChanges = syncApi.getChanges as jest.MockedFunction<typeof syncApi.getChanges>
const push = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>
let fixture: ReturnType<typeof createSqliteTestDb>
const timestamps = {
  created_at: '2026-01-01T10:00:00.000000Z',
  updated_at: '2026-01-01T10:00:00.000000Z', deleted_at: null,
}
const response = (): SyncChangesResponse => ({
  data: {
    notes: [{ ...timestamps, uuid: 'note', title: 'Note', body: 'Text', color: '#91d177',
      is_pinned: true, is_archived: false }],
    shopping_lists: [{ ...timestamps, uuid: 'list', title: 'Tasks', type: 'tasks',
      tags: '["work"]', status: 'in_progress', status_is_manual: true, is_completed: false }],
    shopping_list_items: [{ ...timestamps, uuid: 'item', shopping_list_uuid: 'list',
      name: 'Task', category: 'other', quantity: 7, deadline: '2026-10-03',
      reminder_at: '2026-10-02T12:30:00.000000Z', link: 'https://example.com/task',
      comment: 'Legacy text', tags: '["urgent"]', is_checked: false, status: 'postponed', position: 3 }],
    shopping_list_item_comments: [{ ...timestamps, uuid: 'comment', shopping_list_item_uuid: 'item',
      author_name: 'Alice', body: 'Thread text' }],
    reminders: [{ ...timestamps, uuid: 'reminder', title: 'Reminder', notes: 'Details',
      remind_at: '2026-10-02T12:30:00.000000Z', recurrence: 'weekly', is_completed: false,
      completed_at: null, snoozed_until: null, source_uuid: 'note', source_type: 'note' }],
  },
  meta: { cursor: 5, has_more: false },
})
const queue = () => fixture.db.select().from(syncOutbox).all()
const listRepo = () => new ShoppingListsRepository(fixture.db)

beforeEach(() => {
  fixture = createSqliteTestDb()
  getChanges.mockReset()
  push.mockReset()
})
afterEach(() => fixture.close())

it('passes paged API data through mobile mappers, SQLite and the repositories read by the UI', async () => {
  const full = response()
  getChanges.mockResolvedValueOnce({
    data: { ...full.data, shopping_list_items: [], shopping_list_item_comments: [], reminders: [] },
    meta: { cursor: 2, has_more: true },
  }).mockResolvedValueOnce({ ...full, data: { ...full.data, notes: [], shopping_lists: [] } })
  await pullChanges(fixture.db)
  expect(getChanges.mock.calls).toEqual([[0], [2]])
  expect(await getLastPulledRevision(fixture.db)).toBe(5)
  expect(await new NotesRepository(fixture.db).getNoteByUuid('note')).toMatchObject({
    title: 'Note', body: 'Text', color: '#91d177', isPinned: true, isArchived: false,
  })
  expect(await listRepo().getListByUuid('list')).toMatchObject({
    type: 'tasks', tags: '["work"]', status: 'in_progress', statusIsManual: true,
    isCompleted: false, itemsCount: 1, checkedItemsCount: 0,
  })
  expect(await listRepo().listItems('list')).toEqual([expect.objectContaining({
    uuid: 'item', shoppingListUuid: 'list', quantity: 7, deadline: '2026-10-03',
    reminderAt: full.data.shopping_list_items[0]!.reminder_at,
    link: 'https://example.com/task', comment: 'Legacy text', tags: '["urgent"]',
    isChecked: false, status: 'postponed', position: 3,
  })])
  expect(await new ItemCommentsRepository(fixture.db).listComments('item')).toEqual([
    expect.objectContaining({ authorName: 'Alice', body: 'Thread text', shoppingListItemUuid: 'item' }),
  ])
  expect(await new RemindersRepository(fixture.db).getReminderByUuid('reminder')).toMatchObject({
    notes: 'Details', recurrence: 'weekly', isCompleted: false, sourceUuid: 'note', sourceType: 'note',
  })
  expect(queue()).toEqual([])
})

it('applies explicit clearing and updated quantities without keeping stale metadata', async () => {
  await applyChanges(response(), fixture.db)
  const newer = response()
  Object.assign(newer.data.notes[0]!, { color: null, updated_at: '2026-02-01T00:00:00Z' })
  Object.assign(newer.data.shopping_list_items[0]!, {
    quantity: 1, deadline: null, reminder_at: null, link: null, comment: null, tags: null,
    updated_at: '2026-02-01T00:00:00Z',
  })
  await applyChanges(newer, fixture.db)
  expect((await new NotesRepository(fixture.db).getNoteByUuid('note'))?.color).toBeNull()
  expect((await listRepo().listItems('list'))[0]).toMatchObject({
    quantity: 1, deadline: null, reminderAt: null, link: null, comment: null, tags: null,
  })
  expect(queue()).toEqual([])
})

it('preserves device notification and calendar IDs during repeated pull', async () => {
  await applyChanges(response(), fixture.db)
  fixture.db.update(reminders).set({ notificationId: 'local-notif', calendarEventId: 'local-event' }).run()
  fixture.db.update(shoppingListItems).set({ notificationId: 'local-item-notif' }).run()
  await applyChanges(response(), fixture.db)
  expect(await new RemindersRepository(fixture.db).getReminderByUuid('reminder')).toMatchObject({
    notificationId: 'local-notif', calendarEventId: 'local-event',
  })
  expect((await listRepo().listItems('list'))[0]?.notificationId).toBe('local-item-notif')
  expect(queue()).toEqual([])
})

it('preserves restored fields when a user edits a title and sends a full snapshot', async () => {
  await applyChanges(response(), fixture.db)
  await new NotesRepository(fixture.db).updateNote('note', { title: 'Edited note' })
  await listRepo().updateItem('item', { name: 'Edited task' })
  push.mockResolvedValue({ applied: ['note', 'item'], conflicts: [], cursor: 7 })
  await pushChanges(fixture.db)
  const sent = push.mock.calls[0]![2]
  expect(sent.find((change) => change.uuid === 'note')?.payload).toMatchObject({
    title: 'Edited note', color: '#91d177', body: 'Text',
  })
  expect(sent.find((change) => change.uuid === 'item')?.payload).toMatchObject({
    name: 'Edited task', quantity: 7, deadline: '2026-10-03',
    reminder_at: '2026-10-02T12:30:00.000000Z', link: 'https://example.com/task',
    comment: 'Legacy text', tags: '["urgent"]', shopping_list_uuid: 'list',
  })
  expect(queue()).toEqual([])
  expect(await getLastPulledRevision(fixture.db)).toBe(5)
})

it('retains the exact queue and draft if removing acknowledged rows fails, then retries', async () => {
  const note = await new NotesRepository(fixture.db).createNote({ title: 'Keep draft', color: '#91d177' })
  const original = queue()
  push.mockResolvedValue({ applied: [note.uuid], conflicts: [], cursor: 1 })
  fixture.sqlite.exec(`CREATE TRIGGER fail_ack BEFORE DELETE ON sync_outbox
    BEGIN SELECT RAISE(ABORT, 'ack unavailable'); END;`)
  await expect(pushChanges(fixture.db)).rejects.toThrow()
  expect(queue()).toEqual(original)
  expect(await new NotesRepository(fixture.db).getNoteByUuid(note.uuid)).toEqual(note)
  fixture.sqlite.exec('DROP TRIGGER fail_ack;')
  await pushChanges(fixture.db)
  expect(push.mock.calls[1]![2]).toEqual(push.mock.calls[0]![2])
  expect(queue()).toEqual([])
})

it('hides incoming tombstones from mobile lists without generating outgoing edits', async () => {
  await applyChanges(response(), fixture.db)
  const deleted = response()
  const deletedAt = '2026-02-01T00:00:00Z'
  for (const rows of Object.values(deleted.data)) {
    for (const row of rows) Object.assign(row, { deleted_at: deletedAt, updated_at: deletedAt })
  }
  await applyChanges(deleted, fixture.db)
  expect(await new NotesRepository(fixture.db).listNotes()).toEqual([])
  expect(await listRepo().listLists()).toEqual([])
  expect(await listRepo().listItems('list')).toEqual([])
  expect(await new ItemCommentsRepository(fixture.db).listComments('item')).toEqual([])
  expect(await new RemindersRepository(fixture.db).getReminderByUuid('reminder')).toBeNull()
  expect(fixture.db.select().from(notes).where(eq(notes.uuid, 'note')).get()?.deletedAt).toBe(deletedAt)
  expect(queue()).toEqual([])
})
