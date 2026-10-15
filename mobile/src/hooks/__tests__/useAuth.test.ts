// Real auth hook, account selection, Drizzle migrations, SQLite and sync engine.
// Only native connections, HTTP, navigation and SecureStore are adapted.
jest.mock('@/db/client', () => ({
  DATABASE_NAME: 'napominalki.db',
  get db() { return mockDb },
  activateDatabase: (database: Database, name: string) => {
    mockDb = database
    require('@/db/databaseScope').setActiveDatabaseScope(name)
  },
}))
jest.mock('@/db/accountStorage', () => ({
  ...jest.requireActual('@/db/accountStorage'),
  getAccountDatabase: (owner: string) => mockStorage.manager.getAccountDatabase(owner),
  getLegacyDatabase: () => mockStorage.manager.getLegacyDatabase(),
}))
jest.mock('@/services/netStatus', () => ({ getIsOnline: jest.fn(async () => true), useNetStatus: () => ({ isOnline: true }) }))
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))
jest.mock('@/api/authApi', () => ({ authApi: { login: jest.fn(), register: jest.fn(), logout: jest.fn() } }))
jest.mock('@/api/syncApi', () => ({ syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() } }))

import { createElement, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import * as Crypto from 'expo-crypto'
import { authApi } from '@/api/authApi'
import { syncApi } from '@/api/syncApi'
import DbProvider, { useDb } from '@/providers/DbProvider'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Database } from '@/db/client'
import { useAuthStore } from '@/stores/authStore'
import { FavoritesRepository } from '@/db/repositories/favoritesRepo'
import { NotesRepository, notesRepo } from '@/db/repositories/notesRepo'
import { ShoppingListsRepository } from '@/db/repositories/shoppingListsRepo'
import { RemindersRepository } from '@/db/repositories/remindersRepo'
import { SearchRepository } from '@/db/repositories/searchRepo'
import { notes, syncOutbox } from '@/db/schema'
import { createAccountStorageFixture } from '@/db/testing/accountStorage'
import { setMeta, LAST_USER_ID, getLastPulledRevision } from '@/services/sync/syncMeta'
import { syncEngine } from '@/services/sync/syncEngine'
import type { AuthResponse } from '@/types/auth'
import type { SyncPushResult } from '@/types/sync'
import { useAuth } from '../useAuth'
import { useSyncEngine } from '../useSyncEngine'

let mockDb: Database
let mockStorage: Awaited<ReturnType<typeof createAccountStorageFixture>>
let queryClient: QueryClient
const loginApi = authApi.login as jest.Mock
const push = syncApi.pushChanges as jest.Mock
const response = (uuid: string): AuthResponse => ({
  token: `token-${uuid}`, token_type: 'Bearer',
  user: { uuid, name: uuid, email: `${uuid}@example.com`, is_admin: false,
    sync_enabled: true, created_at: '2026-01-01T00:00:00Z' },
})
const queue = (db: Database) => db.select().from(syncOutbox).all()
const SyncProbe = () => { useSyncEngine(); return null }
const mount = (autoSync = false) => renderHook(() => ({ auth: useAuth(), db: useDb() }), {
  wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider,
    { client: queryClient }, createElement(DbProvider, null, autoSync ? createElement(SyncProbe) : null, children)),
})
const login = async (hook: Awaited<ReturnType<typeof mount>>, owner: string) => {
  loginApi.mockResolvedValue(response(owner))
  await act(async () => {
    await hook.result.current.auth.login.mutateAsync({ email: `${owner}@example.com`, password: 'fixture' })
  })
  await waitFor(() => expect(hook.result.current.db).toBe(mockDb))
}

beforeEach(async () => {
  jest.clearAllMocks()
  let sequence = 0
  ;(Crypto.randomUUID as jest.Mock).mockImplementation(() => `fixture-${++sequence}`)
  mockStorage = await createAccountStorageFixture()
  mockDb = mockStorage.legacy.db
  await setMeta(LAST_USER_ID, 'alice', mockDb)
  useAuthStore.setState({ token: 'token-alice', accountId: 'alice', user: response('alice').user,
    guestMode: false, isSwitching: false, sessionExpired: false, syncEnabled: true, isHydrated: true })
  useSettingsStore.setState({ syncEnabled: true, notificationsEnabled: false, isHydrated: true })
  ;(authApi.logout as jest.Mock).mockResolvedValue(undefined)
  ;(syncApi.getChanges as jest.Mock).mockResolvedValue({ data: { notes: [], reminders: [], shopping_lists: [], shopping_list_items: [] }, meta: { cursor: 0, has_more: false } })
  push.mockReset().mockResolvedValue({ applied: [], conflicts: [], cursor: 0 })
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { gcTime: Infinity } } })
})
afterEach(async () => {
  await cleanup()
  await syncEngine.stop()
  queryClient.clear()
  mockStorage.close()
})

it('offline logout preserves account records/outbox and opens an empty guest database', async () => {
  const account = mockDb
  const note = await new NotesRepository(account).createNote({ title: 'Private unsent draft' })
  await new FavoritesRepository(account).toggle('note', note.uuid)
  const before = queue(account)
  useSettingsStore.setState({ syncEnabled: false })
  ;(authApi.logout as jest.Mock).mockRejectedValue(new Error('offline'))
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.db).toBe(account))
  await act(async () => { await hook.result.current.auth.logout.mutateAsync() })
  await waitFor(() => expect(mockDb).not.toBe(account))
  await act(async () => { await hook.result.current.auth.continueAsGuest() })
  await waitFor(() => expect(hook.result.current.auth.guestMode).toBe(true))
  expect(await notesRepo.getNoteByUuid(note.uuid)).toBeNull()
  expect(queue(account)).toEqual(before)
  expect(push).not.toHaveBeenCalled()
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled()
  await login(hook, 'alice')
  expect(mockDb).toBe(account)
  expect(await notesRepo.getNoteByUuid(note.uuid)).toMatchObject({ title: 'Private unsent draft', isFavorite: true })
  expect(queue(account)).toEqual(before)
})

it('keeps guest notes, purchases, tasks and reminders separate across two logins', async () => {
  useAuthStore.setState({ token: null, accountId: null, user: null, guestMode: true })
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.auth.guestMode).toBe(true))
  const guest = hook.result.current.db
  await new NotesRepository(guest).createNote({ title: 'Guest memo', body: 'only guest' })
  const lists = new ShoppingListsRepository(guest)
  await lists.createList({ title: 'Guest purchases', type: 'goods' })
  await lists.createList({ title: 'Guest tasks', type: 'tasks' })
  await new RemindersRepository(guest).createReminder({ title: 'Guest alarm', remindAt: '2030-01-01T12:00:00Z' })
  const before = queue(guest)
  await login(hook, 'alice')
  expect(mockDb.select().from(notes).all()).toEqual([])
  expect(queue(mockDb)).toEqual([])
  await notesRepo.createNote({ title: 'Alice private' })
  const accountA = mockDb
  await login(hook, 'bob')
  expect(mockDb).not.toBe(accountA)
  expect(queue(mockDb)).toEqual([])
  expect(new SearchRepository(mockDb).search('Alice', 'all', 1, { userId: 'bob', guest: false }).total).toBe(0)
  await act(async () => { await hook.result.current.auth.logout.mutateAsync() })
  await waitFor(() => expect(mockDb).toBe(guest))
  await act(async () => { await hook.result.current.auth.continueAsGuest() })
  await waitFor(() => expect(hook.result.current.auth.guestMode).toBe(true))
  expect(queue(guest)).toEqual(before)
  expect(new SearchRepository(guest).search('Guest', 'all', 1, { userId: null, guest: true }).total).toBe(4)
  await login(hook, 'alice')
  expect(mockDb).toBe(accountA)
  expect(mockDb.select().from(notes).all().map((row) => row.title)).toEqual(['Alice private'])
})

it('401 hides old data immediately, preserves drafts and restores them only for the same account', async () => {
  const account = mockDb
  await notesRepo.createNote({ title: 'Keep after expiry' })
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.db).toBe(account))
  await act(async () => { await useAuthStore.getState().logout(true) })
  await waitFor(() => expect(mockDb).not.toBe(account))
  expect(useAuthStore.getState().sessionExpired).toBe(true)
  expect(mockDb.select().from(notes).all()).toEqual([])
  expect(queue(account)).toHaveLength(1)
  await login(hook, 'bob')
  expect(queue(mockDb)).toEqual([])
  await login(hook, 'alice')
  expect(queue(mockDb)).toHaveLength(1)
})

it('waits for an in-flight push without acknowledging old data into a new account', async () => {
  const account = mockDb
  const note = await notesRepo.createNote({ title: 'Original draft' })
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.db).toBe(account))
  let resolve!: (result: SyncPushResult) => void
  push.mockImplementation(() => new Promise<SyncPushResult>((done) => { resolve = done }))
  const sync = syncEngine.sync()
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
  await notesRepo.updateNote(note.uuid, { title: 'Edited during push' })
  loginApi.mockResolvedValue(response('bob'))
  let switching!: Promise<unknown>
  await act(async () => { switching = hook.result.current.auth.login.mutateAsync({ email: 'bob@example.com', password: 'fixture' }) })
  await waitFor(() => expect(useAuthStore.getState().isSwitching).toBe(true))
  resolve({ applied: [note.uuid], conflicts: [], cursor: 1 })
  await act(async () => { await sync; await switching })
  await waitFor(() => expect(mockDb).not.toBe(account))
  expect(queue(mockDb)).toEqual([])
  expect(queue(account)).toHaveLength(2)
  expect((await new NotesRepository(account).getNoteByUuid(note.uuid))?.title).toBe('Edited during push')
  expect(await getLastPulledRevision(mockDb)).toBe(0)
})

it('restores an upgraded token without an owner key using legacy ownership, never guest data', async () => {
  const account = mockDb
  await notesRepo.createNote({ title: 'Legacy account note' })
  useAuthStore.setState({ accountId: null, user: null })
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.db).toBe(account))
  expect(useAuthStore.getState().accountId).toBe('alice')
  expect(mockDb.select().from(notes).all()[0]?.title).toBe('Legacy account note')
})

it('explicit guest entry closes an existing account session before displaying guest data', async () => {
  const account = mockDb
  await notesRepo.createNote({ title: 'Private account note' })
  const hook = await mount()
  await waitFor(() => expect(hook.result.current?.db).toBe(account))
  await act(async () => { await hook.result.current.auth.continueAsGuest() })
  await waitFor(() => expect(hook.result.current.auth.guestMode).toBe(true))
  expect(useAuthStore.getState().token).toBeNull()
  expect(mockDb).not.toBe(account)
  expect(mockDb.select().from(notes).all()).toEqual([])
  expect(queue(account)).toHaveLength(1)
})

it('restarts automatic sync after a fresh login to the same account', async () => {
  const hook = await mount(true)
  await waitFor(() => expect(syncApi.getChanges).toHaveBeenCalledTimes(1))
  await syncEngine.stop()
  loginApi.mockResolvedValue({ ...response('alice'), token: 'fresh-alice-token' })
  await act(async () => {
    await hook.result.current.auth.login.mutateAsync({ email: 'alice@example.com', password: 'fixture' })
  })
  await waitFor(() => expect(syncApi.getChanges).toHaveBeenCalledTimes(2))
})
