// Exercise the real hook, sync queue, account reset and SQLite. Only external
// APIs, routing, auth storage and the provider's DB connection are replaced.
jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/providers/DbProvider', () => ({ useDb: jest.fn() }))
jest.mock('@/stores/authStore', () => ({ useAuthStore: jest.fn() }))
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))
jest.mock('@/api/authApi', () => ({
  authApi: { login: jest.fn(), register: jest.fn(), logout: jest.fn() },
}))
jest.mock('@/api/syncApi', () => ({
  syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() },
}))

import { createElement, type ReactNode } from 'react'
import { Alert } from 'react-native'
import { act, cleanup, renderHook } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { authApi } from '@/api/authApi'
import { syncApi } from '@/api/syncApi'
import { useDb } from '@/providers/DbProvider'
import { useAuthStore } from '@/stores/authStore'
import { NotesRepository } from '@/db/repositories/notesRepo'
import { notes, syncOutbox } from '@/db/schema'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { getMeta, setMeta, LAST_USER_ID, LAST_PULLED_REVISION } from '@/services/sync/syncMeta'
import type { AuthResponse } from '@/types/auth'
import { useAuth } from '../useAuth'

const mockedUseDb = useDb as jest.MockedFunction<typeof useDb>
const mockedStore = useAuthStore as unknown as jest.Mock
const push = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>
const login = authApi.login as jest.MockedFunction<typeof authApi.login>
const store = {
  token: 'test-token', user: null, guestMode: false,
  setToken: jest.fn(async () => undefined), setUser: jest.fn(),
  setGuestMode: jest.fn(), logout: jest.fn(async () => undefined),
}
let fixture: ReturnType<typeof createSqliteTestDb>
let queryClient: QueryClient
let alert: jest.SpyInstance
const response = (uuid: string): AuthResponse => ({
  token: 'new-token', token_type: 'Bearer',
  user: { uuid, name: 'Alice', email: 'alice@example.com', is_admin: false,
    sync_enabled: true, created_at: '2026-01-01T00:00:00Z' },
})
const mount = () => renderHook(() => useAuth(), {
  wrapper: ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children),
})
const repo = () => new NotesRepository(fixture.db)
const queue = () => fixture.db.select().from(syncOutbox).all()
const choose = (label: string) => alert.mockImplementation((_title, _message, buttons) => {
  const choice = (buttons as NonNullable<Parameters<typeof Alert.alert>[2]>)
    .find((button) => button.text === label)
  expect(choice).toBeDefined()
  choice?.onPress?.()
})
const logout = async () => {
  const { result } = await mount()
  await act(async () => { await result.current.logout.mutateAsync() })
}

beforeEach(() => {
  jest.clearAllMocks()
  fixture = createSqliteTestDb()
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { gcTime: Infinity } } })
  mockedUseDb.mockReturnValue(fixture.db)
  mockedStore.mockImplementation(
    (select: (state: typeof store) => unknown) => select(store),
  )
  store.setToken.mockReset().mockResolvedValue(undefined)
  store.logout.mockReset().mockResolvedValue(undefined)
  push.mockReset().mockResolvedValue({ applied: [], conflicts: [], cursor: 0 })
  login.mockReset()
  alert = jest.spyOn(Alert, 'alert')
  choose('Отмена')
})
afterEach(async () => {
  await cleanup()
  queryClient.clear()
  fixture.close()
  alert.mockRestore()
})

describe('useAuth logout with the real mobile queue', () => {
  it('preserves unacknowledged data after HTTP success when the user cancels', async () => {
    const note = await repo().createNote({ title: 'Still pending' })
    const originalQueue = queue()
    await logout()
    expect(alert).toHaveBeenCalledTimes(1)
    expect(queue()).toEqual(originalQueue)
    expect((await repo().getNoteByUuid(note.uuid))?.title).toBe('Still pending')
    expect(authApi.logout).not.toHaveBeenCalled()
    expect(store.logout).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled()
  })

  it('preserves an edit created during the successful push', async () => {
    const note = await repo().createNote({ title: 'Sent version' })
    push.mockImplementationOnce(async () => {
      await repo().updateNote(note.uuid, { title: 'New local draft' })
      return { applied: [note.uuid], conflicts: [], cursor: 1 }
    })
    await logout()
    expect(alert).toHaveBeenCalledTimes(1)
    expect(queue()).toHaveLength(1)
    expect(JSON.parse(queue()[0]!.payload).title).toBe('New local draft')
    expect((await repo().getNoteByUuid(note.uuid))?.title).toBe('New local draft')
    expect(store.logout).not.toHaveBeenCalled()
  })

  it('logs out without prompting after every queued edit is acknowledged', async () => {
    const note = await repo().createNote({ title: 'Synced' })
    push.mockResolvedValue({ applied: [note.uuid], conflicts: [], cursor: 1 })
    await logout()
    expect(alert).not.toHaveBeenCalled()
    expect(queue()).toEqual([])
    expect(fixture.db.select().from(notes).all()).toEqual([])
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1)
    expect(authApi.logout).toHaveBeenCalledTimes(1)
    expect(store.logout).toHaveBeenCalledTimes(1)
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login')
  })

  it('logs out with an empty queue without making a push request', async () => {
    await logout()
    expect(push).not.toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()
    expect(store.logout).toHaveBeenCalledTimes(1)
  })

  it.each(['Отмена', 'Выйти'])('respects %s after a failed push', async (choice) => {
    const note = await repo().createNote({ title: 'Offline' })
    push.mockRejectedValue(new Error('Push failed'))
    choose(choice)
    await logout()
    expect(alert).toHaveBeenCalledTimes(1)
    if (choice === 'Отмена') {
      expect(queue()).toHaveLength(1)
      expect(await repo().getNoteByUuid(note.uuid)).not.toBeNull()
      expect(store.logout).not.toHaveBeenCalled()
    } else {
      expect(queue()).toEqual([])
      expect(await repo().getNoteByUuid(note.uuid)).toBeNull()
      expect(store.logout).toHaveBeenCalledTimes(1)
    }
  })

  it('clears unacknowledged data only after explicit confirmation', async () => {
    await repo().createNote({ title: 'User chooses to discard' })
    choose('Выйти')
    await logout()
    expect(alert).toHaveBeenCalledTimes(1)
    expect(queue()).toEqual([])
    expect(fixture.db.select().from(notes).all()).toEqual([])
    expect(store.logout).toHaveBeenCalledTimes(1)
  })
})

describe('useAuth login with persisted account metadata', () => {
  it.each([null, 'incoming-user', 'old-user'])('prepares the account and cursor before exposing the token (previous=%s)', async (previous) => {
    const note = await repo().createNote({ title: 'Existing local data' })
    // Previous account has no unsent edits; guest/same-account drafts must survive.
    if (previous === 'old-user') fixture.db.delete(syncOutbox).run()
    if (previous !== null) await setMeta(LAST_USER_ID, previous, fixture.db)
    await setMeta(LAST_PULLED_REVISION, '123', fixture.db)
    login.mockResolvedValue(response('incoming-user'))
    store.setToken.mockImplementationOnce(async () => {
      expect(await getMeta(LAST_USER_ID, fixture.db)).toBe('incoming-user')
      expect(await getMeta(LAST_PULLED_REVISION, fixture.db)).toBe('0')
      expect(await repo().getNoteByUuid(note.uuid)).toEqual(previous === 'old-user' ? null : note)
    })
    const { result } = await mount()
    await act(async () => {
      await result.current.login.mutateAsync({ email: 'alice@example.com', password: 'fixture-password' })
    })
    expect(store.setToken).toHaveBeenCalledWith('new-token')
    expect(store.setUser).toHaveBeenCalledWith(response('incoming-user').user)
    expect(router.replace).toHaveBeenCalledWith('/(tabs)')
    expect(queue()).toHaveLength(previous === 'old-user' ? 0 : 1)
  })
})
