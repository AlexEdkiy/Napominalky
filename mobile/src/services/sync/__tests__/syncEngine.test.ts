// Production engine, stores, push/pull, mapping and SQLite. Only HTTP/network is mocked.
jest.mock('@/db/client', () => ({ get db() { return mockDb } }))
jest.mock('@/api/syncApi', () => ({ syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() } }))
jest.mock('@/services/netStatus', () => ({ getIsOnline: jest.fn(async () => true) }))

import { AxiosError, CanceledError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getIsOnline } from '@/services/netStatus'
import { syncApi } from '@/api/syncApi'
import type { Database } from '@/db/client'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { NotesRepository } from '@/db/repositories/notesRepo'
import { syncOutbox } from '@/db/schema'
import { resetLocalData } from '@/db/resetLocalData'
import type { SyncChangesResponse, SyncPushResult } from '@/types/sync'
import { getLastPulledRevision, getLastSyncedAt } from '../syncMeta'
import { syncEngine } from '../syncEngine'

let mockDb: Database
let fixture: ReturnType<typeof createSqliteTestDb>
const push = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>
const pull = syncApi.getChanges as jest.MockedFunction<typeof syncApi.getChanges>
const online = getIsOnline as jest.MockedFunction<typeof getIsOnline>
const repo = () => new NotesRepository(mockDb)
const queue = () => mockDb.select().from(syncOutbox).all()
const emptyPage = (): SyncChangesResponse => ({ data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] }, meta: { cursor: 0, has_more: false } })
const page = (): SyncChangesResponse => ({ ...emptyPage(), data: { ...emptyPage().data, notes: [{ uuid: 'remote-note', title: 'From server', body: 'Text', color: null, is_pinned: false, is_archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null }] }, meta: { cursor: 1, has_more: false } })
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
const until = async (condition: () => boolean) => { for (let i = 0; i < 80 && !condition(); i++) await Promise.resolve(); expect(condition()).toBe(true) }

beforeEach(() => {
  jest.clearAllMocks()
  fixture = createSqliteTestDb(); mockDb = fixture.db
  useAuthStore.setState({ token: 'fixture-token', user: null, syncEnabled: true, isHydrated: true })
  useSettingsStore.setState({ syncEnabled: true, isHydrated: true })
  online.mockResolvedValue(true)
  push.mockReset().mockImplementation(async (_id, _name, changes) => ({ applied: changes.map((c) => c.uuid), conflicts: [], cursor: 1 }))
  pull.mockReset().mockResolvedValue(emptyPage())
})
afterEach(async () => { await syncEngine.stop(); fixture.close(); jest.useRealTimers() })

it.each([false, true])('local OFF blocks automatic/manual sync (force=%s), preserving the queue', async (force) => {
  await repo().createNote({ title: 'Keep local' })
  const before = queue()
  useSettingsStore.setState({ syncEnabled: false })
  expect(await syncEngine.sync({ force })).toEqual({ ok: false, error: 'sync_disabled' })
  expect(push).not.toHaveBeenCalled(); expect(pull).not.toHaveBeenCalled()
  expect(queue()).toEqual(before)
})

it.each(['server-off', 'not-hydrated', 'no-token', 'offline'])('blocks data transfer: %s', async (mode) => {
  await repo().createNote({ title: 'Pending' })
  if (mode === 'server-off') useAuthStore.setState({ syncEnabled: false })
  if (mode === 'not-hydrated') useSettingsStore.setState({ isHydrated: false })
  if (mode === 'no-token') useAuthStore.setState({ token: null })
  if (mode === 'offline') online.mockResolvedValue(false)
  expect((await syncEngine.sync({ force: true })).ok).toBe(false)
  expect(push).not.toHaveBeenCalled(); expect(queue()).toHaveLength(1)
})

it('resumes preserved edits when enabled, applies fields used by UI and updates the cursor', async () => {
  await repo().createNote({ title: 'Offline draft' })
  useSettingsStore.setState({ syncEnabled: false })
  await syncEngine.sync()
  useSettingsStore.setState({ syncEnabled: true })
  pull.mockResolvedValue(page())
  expect(await syncEngine.sync()).toMatchObject({ ok: true, pushed: 1 })
  expect(queue()).toEqual([])
  expect(await repo().getNoteByUuid('remote-note')).toMatchObject({ title: 'From server', body: 'Text' })
  expect(await getLastPulledRevision(mockDb)).toBe(1)
  expect(await getLastSyncedAt(mockDb)).toBeTruthy()
})

it('single-flights concurrent triggers and notifies subscribers', async () => {
  const callback = jest.fn(); const off = syncEngine.onChange(callback)
  const first = syncEngine.sync(); const second = syncEngine.sync()
  expect(second).toBe(first); await first
  expect(pull).toHaveBeenCalledTimes(1); expect(callback).toHaveBeenCalledTimes(1); off()
})

it('OFF then ON during push cancels the old session without deleting a newer edit', async () => {
  const note = await repo().createNote({ title: 'Sent' })
  const response = deferred<SyncPushResult>(); push.mockReturnValueOnce(response.promise)
  const run = syncEngine.sync(); await until(() => push.mock.calls.length === 1)
  await repo().updateNote(note.uuid, { title: 'New draft' })
  useSettingsStore.setState({ syncEnabled: false }); useSettingsStore.setState({ syncEnabled: true })
  expect(push.mock.calls[0]![3]?.signal.aborted).toBe(true)
  response.resolve({ applied: [note.uuid], conflicts: [], cursor: 1 })
  expect(await run).toMatchObject({ ok: false, error: 'sync_cancelled' })
  expect(queue()).toHaveLength(2); expect(pull).not.toHaveBeenCalled()
  expect(await repo().getNoteByUuid(note.uuid)).toMatchObject({ title: 'New draft' })
  expect((await syncEngine.sync()).ok).toBe(true); expect(queue()).toHaveLength(0)
})

it('does not send the next 500-record batch after OFF', async () => {
  for (let i = 0; i < 501; i++) mockDb.insert(syncOutbox).values({ entityType: 'note', entityUuid: `n${i}`, operation: 'update', payload: '{}', updatedAt: '2026-01-01', createdAt: '2026-01-01' }).run()
  push.mockImplementationOnce(async () => { useSettingsStore.setState({ syncEnabled: false }); return { applied: ['n0'], conflicts: [], cursor: 1 } })
  expect((await syncEngine.sync()).ok).toBe(false)
  expect(push).toHaveBeenCalledTimes(1); expect(queue()).toHaveLength(501)
})

it.each(['logout', 'switch', 'off'])('rejects an in-flight pull after %s without moving the cursor', async (action) => {
  const response = deferred<SyncChangesResponse>(); pull.mockReturnValueOnce(response.promise)
  const run = syncEngine.sync(); await until(() => pull.mock.calls.length === 1)
  if (action === 'logout') await useAuthStore.getState().logout()
  else if (action === 'switch') {
    useAuthStore.setState({ token: 'another-token' }); await resetLocalData(mockDb)
    await repo().createNote({ title: 'New account data' })
  } else useSettingsStore.setState({ syncEnabled: false })
  response.resolve(page()); expect((await run).ok).toBe(false)
  expect(await repo().getNoteByUuid('remote-note')).toBeNull()
  expect(await getLastPulledRevision(mockDb)).toBe(0)
  expect(queue()).toHaveLength(action === 'switch' ? 1 : 0)
})

it('stops network retry after the switch is turned off', async () => {
  jest.useFakeTimers()
  await repo().createNote({ title: 'Retry later' })
  push.mockRejectedValue(new AxiosError('offline'))
  const run = syncEngine.sync(); await until(() => push.mock.calls.length === 1)
  useSettingsStore.setState({ syncEnabled: false })
  await jest.advanceTimersByTimeAsync(1000)
  expect((await run).ok).toBe(false); expect(push).toHaveBeenCalledTimes(1); expect(queue()).toHaveLength(1)
})

it('does not retry Axios cancellations', async () => {
  await repo().createNote({ title: 'Cancel' })
  push.mockRejectedValue(new CanceledError())
  expect((await syncEngine.sync()).ok).toBe(false); expect(push).toHaveBeenCalledTimes(1)
})
