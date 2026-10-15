jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/api/syncApi', () => ({ syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() } }))

import { randomUUID } from 'node:crypto'
import * as Crypto from 'expo-crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { ShoppingListsRepository } from '../shoppingListsRepo'
import { NotesRepository } from '../notesRepo'
import { RemindersRepository } from '../remindersRepo'
import { SearchRepository } from '../searchRepo'
import { FavoritesRepository } from '../favoritesRepo'
import { ItemOrderRepository } from '../itemOrderRepo'
import { syncOutbox, shoppingListItems, notes } from '@/db/schema'
import { applyChanges } from '@/services/sync/applyChanges'
import { pushChanges } from '@/services/sync/pushChanges'
import { syncApi } from '@/api/syncApi'
import type { SyncChangesResponse } from '@/types/sync'

let fixture: ReturnType<typeof createSqliteTestDb>
let lists: ShoppingListsRepository
let favorites: FavoritesRepository
let order: ItemOrderRepository
const queue = () => fixture.db.select().from(syncOutbox).all()
const push = jest.mocked(syncApi.pushChanges)
const emptyPull = (): SyncChangesResponse => ({ data: {
  notes: [], shopping_lists: [], shopping_list_items: [], reminders: [],
}, meta: { cursor: 1, has_more: false } })
beforeEach(() => {
  jest.mocked(Crypto.randomUUID).mockImplementation(randomUUID)
  fixture = createSqliteTestDb()
  lists = new ShoppingListsRepository(fixture.db)
  favorites = new FavoritesRepository(fixture.db)
  order = new ItemOrderRepository(fixture.db)
  push.mockReset()
})
afterEach(() => fixture.close())

it('stars all four entity types offline, prioritizes them and preserves pin/completion flags', async () => {
  const nr = new NotesRepository(fixture.db)
  const rr = new RemindersRepository(fixture.db)
  const pinned = await nr.createNote({ title: 'Alpha', isPinned: true })
  const note = await nr.createNote({ title: 'Zeta' })
  const list = await lists.createList({ title: 'Zeta' })
  await lists.createList({ title: 'Alpha' })
  const first = await lists.addItem(list.uuid, { name: 'First' })
  const last = await lists.addItem(list.uuid, { name: 'Last', isChecked: true })
  await rr.createReminder({ title: 'Early', remindAt: '2020-01-01T12:00:00Z' })
  const reminder = await rr.createReminder({ title: 'Late', remindAt: '2021-01-01T12:00:00Z' })
  fixture.db.delete(syncOutbox).run()
  await favorites.toggle('note', note.uuid)
  await favorites.toggle('shopping_list', list.uuid)
  await favorites.toggle('shopping_list_item', last.uuid)
  await favorites.toggle('reminder', reminder.uuid)
  expect(queue()).toHaveLength(4)
  expect(queue().every((entry) => JSON.parse(entry.payload).is_favorite === 1)).toBe(true)
  expect((await nr.listNotes()).map((row) => row.uuid)).toEqual([note.uuid, pinned.uuid])
  expect((await lists.listLists())[0]?.uuid).toBe(list.uuid)
  expect((await lists.listItems(list.uuid)).map((row) => row.uuid)).toEqual([last.uuid, first.uuid])
  expect((await rr.listReminders())[0]?.uuid).toBe(reminder.uuid)
  expect((await lists.listItems(list.uuid))[0]?.isChecked).toBe(true)
  expect((await nr.getNoteByUuid(pinned.uuid))?.isPinned).toBe(true)
  await favorites.toggle('shopping_list_item', last.uuid)
  expect((await lists.listItems(list.uuid))[0]?.uuid).toBe(first.uuid)
})

it('increments from 1 without lost rapid taps, bounded at 9999, and commits each snapshot', async () => {
  const list = await lists.createList({ title: 'Shopping' })
  const item = await lists.addItem(list.uuid, { name: 'Milk' })
  expect(item.quantity).toBe(1)
  fixture.db.delete(syncOutbox).run()
  await Promise.all(Array.from({ length: 15 }, () => order.incrementQuantity(list.uuid, item.uuid)))
  expect((await lists.listItems(list.uuid))[0]?.quantity).toBe(16)
  expect(queue().map((row) => JSON.parse(row.payload).quantity)).toEqual(Array.from({ length: 15 }, (_, i) => i + 2))
  expect(new Set(queue().map((row) => row.updatedAt)).size).toBe(15)
  await lists.updateItem(item.uuid, { quantity: 9999 })
  await order.incrementQuantity(list.uuid, item.uuid)
  expect((await lists.listItems(list.uuid))[0]?.quantity).toBe(9999)
})

it('reorders a filtered subset in one transaction, retaining hidden slots and rejecting foreign/deleted IDs', async () => {
  const list = await lists.createList({ title: 'Tasks', type: 'tasks' })
  const a = await lists.addItem(list.uuid, { name: 'A' })
  const hidden = await lists.addItem(list.uuid, { name: 'Done', isChecked: true })
  const b = await lists.addItem(list.uuid, { name: 'B' })
  const c = await lists.addItem(list.uuid, { name: 'C' })
  fixture.db.delete(syncOutbox).run()
  await order.reorder(list.uuid, [c.uuid, a.uuid, b.uuid])
  expect((await lists.listItems(list.uuid)).map((row) => row.uuid)).toEqual([c.uuid, hidden.uuid, a.uuid, b.uuid])
  expect(queue()).toHaveLength(3)
  expect(queue().map((entry) => JSON.parse(entry.payload).position)).toEqual([0, 2, 3])
  const before = queue()
  await expect(order.reorder(list.uuid, [a.uuid, 'foreign'])).rejects.toThrow()
  expect(queue()).toEqual(before)
  await favorites.toggle('shopping_list_item', a.uuid)
  await expect(order.reorder(list.uuid, [b.uuid, a.uuid])).rejects.toThrow()
  await lists.deleteItem(b.uuid)
  await expect(order.reorder(list.uuid, [b.uuid, c.uuid])).rejects.toThrow()
  expect((await lists.listItems(list.uuid)).some((row) => row.uuid === b.uuid)).toBe(false)
})

it('rolls back both domain data and queue if writing any outbox row fails', async () => {
  const list = await lists.createList({ title: 'Shopping' })
  const a = await lists.addItem(list.uuid, { name: 'A' })
  const b = await lists.addItem(list.uuid, { name: 'B' })
  fixture.db.delete(syncOutbox).run()
  fixture.sqlite.exec(`CREATE TRIGGER fail_outbox BEFORE INSERT ON sync_outbox
    BEGIN SELECT RAISE(ABORT, 'disk full'); END;`)
  await expect(order.reorder(list.uuid, [b.uuid, a.uuid])).rejects.toThrow('disk full')
  await expect(order.incrementQuantity(list.uuid, a.uuid)).rejects.toThrow('disk full')
  await expect(favorites.toggle('shopping_list_item', a.uuid)).rejects.toThrow('disk full')
  expect((await lists.listItems(list.uuid)).map((row) => [row.uuid, row.quantity, row.isFavorite]))
    .toEqual([[a.uuid, 1, false], [b.uuid, 1, false]])
  expect(queue()).toEqual([])
})

it('retries offline push and keeps a newer favorite edit while acknowledging the sent snapshot', async () => {
  const note = await new NotesRepository(fixture.db).createNote({ title: 'Draft' })
  fixture.db.delete(syncOutbox).run()
  await favorites.toggle('note', note.uuid)
  push.mockRejectedValueOnce(new Error('offline'))
  await expect(pushChanges(fixture.db)).rejects.toThrow('offline')
  expect(queue()).toHaveLength(1)
  push.mockImplementationOnce(async () => {
    await favorites.toggle('note', note.uuid)
    return { applied: [note.uuid], conflicts: [], cursor: 1 }
  })
  // The production function may drain the next batch too; its snapshot must contain the new edit.
  push.mockResolvedValue({ applied: [note.uuid], conflicts: [], cursor: 2 })
  await pushChanges(fixture.db)
  if (queue().length) await pushChanges(fixture.db)
  expect(push.mock.calls[0]?.[2][0]?.payload.is_favorite).toBe(1)
  expect(push.mock.calls[1]?.[2]).toEqual(push.mock.calls[0]?.[2])
  expect(push.mock.calls.at(-1)?.[2][0]?.payload.is_favorite).toBe(0)
  expect(fixture.db.select().from(notes).get()?.isFavorite).toBe(0)
  expect(queue()).toEqual([])
})

it('pull applies flags/order/quantity to a second device, preserves absent legacy fields and device IDs', async () => {
  const list = await lists.createList({ title: 'Shopping' })
  const a = await lists.addItem(list.uuid, { name: 'A' })
  const b = await lists.addItem(list.uuid, { name: 'B' })
  await order.incrementQuantity(list.uuid, b.uuid)
  await favorites.toggle('shopping_list_item', b.uuid)
  const second = createSqliteTestDb()
  try {
    const incoming = emptyPull()
    const outgoing = queue().map((row) => ({ ...JSON.parse(row.payload), is_favorite: JSON.parse(row.payload).is_favorite === 1 }))
    incoming.data.shopping_lists = outgoing.filter((row) => row.uuid === list.uuid)
    incoming.data.shopping_list_items = outgoing.filter((row) => row.uuid !== list.uuid)
    await applyChanges(incoming, second.db)
    const repo = new ShoppingListsRepository(second.db)
    expect((await repo.listItems(list.uuid)).map((row) => [row.uuid, row.quantity, row.isFavorite]))
      .toEqual([[b.uuid, 2, true], [a.uuid, 1, false]])
    const legacy = incoming.data.shopping_list_items.at(-1)!
    delete legacy.is_favorite
    legacy.updated_at = '2099-01-01T00:00:00Z'
    incoming.data.shopping_list_items = [legacy]
    second.db.update(shoppingListItems).set({ notificationId: 'local' }).run()
    await applyChanges(incoming, second.db)
    expect((await repo.listItems(list.uuid))[0]).toMatchObject({ uuid: b.uuid, isFavorite: true, notificationId: 'local' })
    expect(second.db.select().from(syncOutbox).all()).toEqual([])
    expect((await lists.listItems(list.uuid))[0]?.isFavorite).toBe(true)
  } finally { second.close() }
})

it('prioritizes favorites before search pagination and keeps separate databases isolated', async () => {
  const repo = new NotesRepository(fixture.db)
  const created = []
  for (let i = 0; i < 25; i++) created.push(await repo.createNote({ title: `Запись ${i}` }))
  await favorites.toggle('note', created[0]!.uuid)
  const result = new SearchRepository(fixture.db).search('Запись', 'all', 1, { guest: true, userId: null })
  expect(result.results[0]).toMatchObject({ uuid: created[0]!.uuid, isFavorite: true })
  const guest = createSqliteTestDb()
  try {
    await new FavoritesRepository(guest.db).toggle('note', created[0]!.uuid)
    expect(guest.db.select().from(notes).all()).toEqual([])
    expect(guest.db.select().from(syncOutbox).all()).toEqual([])
    expect((await repo.getNoteByUuid(created[0]!.uuid))?.isFavorite).toBe(true)
  } finally { guest.close() }
})

it('upgrades legacy rows without losing timestamps or an unsent outbox', () => {
  const old = createSqliteTestDb(false)
  try {
    const directory = join(__dirname, '../../migrations')
    for (const name of readdirSync(directory).filter((name) => name.endsWith('.sql') && !name.startsWith('0013')).sort()) {
      old.sqlite.exec(readFileSync(join(directory, name), 'utf8'))
    }
    old.sqlite.exec(`INSERT INTO notes(uuid,title,is_pinned,updated_at) VALUES ('legacy','Draft',1,'2026-01-01');
      INSERT INTO sync_outbox(entity_type,entity_uuid,operation,payload,updated_at)
        VALUES ('note','legacy','update','{"title":"Draft"}','2026-01-01');`)
    old.sqlite.exec(readFileSync(join(directory, '0013_favorites.sql'), 'utf8'))
    expect(old.db.select().from(notes).get()).toMatchObject({ uuid: 'legacy', isFavorite: 0, isPinned: 1, updatedAt: '2026-01-01' })
    expect(old.db.select().from(syncOutbox).all()).toHaveLength(1)
  } finally { old.close() }
})
