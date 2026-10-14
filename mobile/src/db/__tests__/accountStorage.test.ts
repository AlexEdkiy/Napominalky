jest.mock('@/db/client', () => ({ DATABASE_NAME: 'napominalki.db' }))

import { eq } from 'drizzle-orm'
import { NotesRepository } from '../repositories/notesRepo'
import { notes, syncMeta, syncOutbox } from '../schema'
import { createAccountStorageFixture } from '../testing/accountStorage'
import { identifyLegacyOwner } from '../accountStorage'
import { LAST_USER_ID, setMeta, getLastPulledRevision } from '@/services/sync/syncMeta'

let storage: Awaited<ReturnType<typeof createAccountStorageFixture>>
beforeEach(async () => { storage = await createAccountStorageFixture() })
afterEach(() => storage.close())

it('upgrades the legacy account DB in place, preserving outbox, cursor, tombstones and profile', async () => {
  const db = storage.legacy.db
  await setMeta(LAST_USER_ID, 'alice', db)
  await setMeta('last_pulled_revision', '123', db)
  await setMeta('account_profile', '{"name":"Alice","avatar":"fixture"}', db)
  const repo = new NotesRepository(db)
  const note = await repo.createNote({ title: 'Local pending note' })
  await repo.deleteNote(note.uuid)
  const queue = db.select().from(syncOutbox).all()
  const account = await storage.manager.getAccountDatabase('alice')
  expect(account.db).toBe(db)
  expect(account.name).toBe('napominalki.db')
  expect(await getLastPulledRevision(account.db)).toBe(123)
  expect(account.db.select().from(notes).all()[0]?.deletedAt).not.toBeNull()
  expect(account.db.select().from(syncOutbox).all()).toEqual(queue)
  const guest = await storage.manager.getAccountDatabase('guest')
  expect(guest.db.select().from(notes).all()).toEqual([])
  expect(guest.db.select().from(syncOutbox).all()).toEqual([])
  expect(guest.db.select().from(syncMeta).where(eq(syncMeta.key, 'account_profile')).get()).toBeUndefined()
  expect((await storage.restart().getAccountDatabase('alice')).db).toBe(db)
})

it('retains genuine legacy guest data and never imports it into a new account', async () => {
  const note = await new NotesRepository(storage.legacy.db).createNote({ title: 'Guest draft' })
  const guest = await storage.manager.getAccountDatabase('guest')
  expect(guest.db).toBe(storage.legacy.db)
  const account = await storage.manager.getAccountDatabase('alice')
  expect(await new NotesRepository(account.db).getNoteByUuid(note.uuid)).toBeNull()
  expect(account.db.select().from(syncOutbox).all()).toEqual([])
  expect((await storage.restart().getAccountDatabase('guest')).db.select().from(syncOutbox).all()).toHaveLength(1)
})

it('does not reveal unowned account rows as guest data when legacy metadata is missing', async () => {
  await new NotesRepository(storage.legacy.db).createNote({ title: 'Unclaimed private data', userId: 'alice' })
  expect(identifyLegacyOwner(storage.legacy.db)).toBe('unclaimed')
  const guest = await storage.manager.getAccountDatabase('guest')
  expect(guest.db).not.toBe(storage.legacy.db)
  expect(guest.db.select().from(notes).all()).toEqual([])
  expect(storage.legacy.db.select().from(notes).all()).toHaveLength(1)
})

it('deduplicates concurrent initialization and restores each file across process restarts', async () => {
  const [first, second] = await Promise.all([
    storage.manager.getAccountDatabase('alice'), storage.manager.getAccountDatabase('alice'),
  ])
  expect(first.db).toBe(second.db)
  await new NotesRepository(first.db).createNote({ title: 'Alice' })
  const bob = await storage.manager.getAccountDatabase('bob')
  expect(bob.db.select().from(notes).all()).toEqual([])
  const restarted = storage.restart()
  expect((await restarted.getAccountDatabase('alice')).db.select().from(notes).all()[0]?.title).toBe('Alice')
  expect((await restarted.getAccountDatabase('bob')).db.select().from(syncOutbox).all()).toEqual([])
})
