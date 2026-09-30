jest.mock('../client', () => ({ db: {} }))

import * as Notifications from 'expo-notifications'
import { BaseRepository } from '../repositories/baseRepo'
import { resetLocalData } from '../resetLocalData'
import { notes, shoppingListItems, shoppingListItemComments, shoppingLists, reminders, syncMeta, syncOutbox } from '../schema'
import { createSqliteTestDb } from '../testing/sqlite'

let fixture: ReturnType<typeof createSqliteTestDb>
const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock

beforeEach(() => {
  fixture = createSqliteTestDb()
  cancelAll.mockReset()
})
afterEach(() => fixture.close())

const failEnqueue = () => fixture.sqlite.exec(`
  CREATE TRIGGER fail_enqueue BEFORE INSERT ON sync_outbox
  BEGIN SELECT RAISE(ABORT, 'outbox unavailable'); END;
`)
const repo = () => new BaseRepository(notes, 'note', fixture.db)

describe('domain + outbox on SQLite with the Expo Drizzle driver', () => {
  it('rolls back insert if enqueue fails', async () => {
    failEnqueue()
    await expect(repo().insert({ title: 'Unsaved', color: '#91d177' })).rejects.toThrow()
    expect(fixture.db.select().from(notes).all()).toEqual([])
    expect(fixture.db.select().from(syncOutbox).all()).toEqual([])
  })

  it.each(['update', 'delete'] as const)('rolls back %s and preserves the previous queue on enqueue failure', async (operation) => {
    const original = await repo().insert({ title: 'Keep me', color: '#91d177' })
    const queued = fixture.db.select().from(syncOutbox).all()
    failEnqueue()
    const result = operation === 'update'
      ? repo().update(original.uuid, { title: 'Changed' })
      : repo().softDelete(original.uuid)
    await expect(result).rejects.toThrow()
    expect(fixture.db.select().from(notes).all()).toEqual([original])
    expect(fixture.db.select().from(syncOutbox).all()).toEqual(queued)
  })

  it('commits full snapshots for create, update and tombstone', async () => {
    const created = await repo().insert({ title: 'Draft', body: 'Body', color: '#91d177' })
    const updated = await repo().update(created.uuid, { title: 'Edited' })
    const deleted = await repo().softDelete(created.uuid)
    const queue = fixture.db.select().from(syncOutbox).all()
    expect(queue.map((entry) => entry.operation)).toEqual(['create', 'update', 'delete'])
    for (const [index, row] of [created, updated, deleted].entries()) {
      expect(JSON.parse(queue[index]!.payload)).toMatchObject({
        uuid: row!.uuid, title: row!.title, color: '#91d177', body: 'Body',
        updated_at: row!.updatedAt, deleted_at: row!.deletedAt,
      })
    }
    expect(deleted?.deletedAt).toBeTruthy()
    expect(fixture.db.select().from(notes).all()).toEqual([deleted])
  })

  it('does not enqueue missing entities or failed domain writes', async () => {
    expect(await repo().update('missing', { title: 'Missing' })).toBeNull()
    expect(await repo().softDelete('missing')).toBeNull()
    fixture.sqlite.exec(`CREATE TRIGGER fail_domain BEFORE INSERT ON notes
      BEGIN SELECT RAISE(ABORT, 'domain unavailable'); END;`)
    await expect(repo().insert({ title: 'Failed' })).rejects.toThrow()
    expect(fixture.db.select().from(syncOutbox).all()).toEqual([])
  })
})

const tables = [syncOutbox, shoppingListItemComments, shoppingListItems, shoppingLists, reminders, notes, syncMeta]
const snapshot = () => tables.map((table) => fixture.db.select().from(table).all())
const seedAccount = async () => {
  await repo().insert({ title: 'Private' })
  fixture.sqlite.exec(`
    INSERT INTO shopping_lists(uuid, title, updated_at) VALUES ('list', 'Tasks', '2026-09-30T00:00:00Z');
    INSERT INTO shopping_list_items(uuid, shopping_list_uuid, name, updated_at) VALUES ('item', 'list', 'Task', '2026-09-30T00:00:00Z');
    INSERT INTO shopping_list_item_comments(uuid, shopping_list_item_uuid, author_name, body, updated_at)
      VALUES ('comment', 'item', 'Author', 'Private comment', '2026-09-30T00:00:00Z');
    INSERT INTO reminders(uuid, title, remind_at, updated_at) VALUES ('reminder', 'Private reminder', '2026-10-01T00:00:00Z', '2026-09-30T00:00:00Z');
    INSERT INTO sync_meta(key, value) VALUES ('last_pulled_revision', '42');
  `)
}

describe('account reset on SQLite with the Expo Drizzle driver', () => {
  it('rolls back every table and keeps notifications if the last delete fails', async () => {
    await seedAccount()
    const original = snapshot()
    fixture.sqlite.exec(`CREATE TRIGGER fail_reset BEFORE DELETE ON sync_meta
      BEGIN SELECT RAISE(ABORT, 'reset unavailable'); END;`)
    await expect(resetLocalData(fixture.db)).rejects.toThrow()
    expect(snapshot()).toEqual(original)
    expect(cancelAll).not.toHaveBeenCalled()
  })

  it('clears comments as well as all other account data before cancelling notifications', async () => {
    await seedAccount()
    cancelAll.mockImplementation(async () => {
      expect(snapshot()).toEqual(tables.map(() => []))
      // A new transaction proves the reset transaction has committed.
      fixture.sqlite.exec('BEGIN; ROLLBACK;')
    })
    await resetLocalData(fixture.db)
    expect(snapshot()).toEqual(tables.map(() => []))
    expect(cancelAll).toHaveBeenCalledTimes(1)
  })
})
