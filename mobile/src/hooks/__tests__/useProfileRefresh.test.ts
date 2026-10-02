jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/providers/DbProvider', () => ({ useDb: () => mockDb }))
jest.mock('@/services/netStatus', () => ({ useNetStatus: () => ({ isOnline: mockOnline }) }))
jest.mock('@/api/authApi', () => ({ authApi: { getMe: jest.fn() } }))
import { act, renderHook, cleanup } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { useProfileRefresh } from '../useProfileRefresh'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/authApi'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import type { Database } from '@/db/client'
import type { User } from '@/types/auth'
import { setMeta, LAST_USER_ID } from '@/services/sync/syncMeta'
import { readProfileCache, writeProfileCache } from '@/services/profileCache'

let mockDb: Database
let mockOnline = false
let f: ReturnType<typeof createSqliteTestDb>
const user: User = { uuid: 'alice', name: 'Александр', email: 'fixture@example.com', avatar: 'data:image/png;base64,fixture', is_admin: false, sync_enabled: true, created_at: '2026-01-01' }
const fetch = authApi.getMe as jest.Mock
beforeEach(async () => {
  f = createSqliteTestDb(); mockDb = f.db; mockOnline = false
  await setMeta(LAST_USER_ID, user.uuid, mockDb)
  useAuthStore.setState({ token: 'fixture', user: null, isHydrated: true, profileLoading: false, profileError: null })
  fetch.mockReset().mockResolvedValue(user)
})
afterEach(async () => { await cleanup(); f.close() })
it('restores cached profile offline, refreshes on reconnection and persists the new photo', async () => {
  writeProfileCache(mockDb, user)
  const { rerender } = await renderHook(() => useProfileRefresh())
  expect(useAuthStore.getState().user).toEqual(user)
  expect(fetch).not.toHaveBeenCalled()
  const updated = { ...user, name: 'Новое имя', avatar: 'data:image/png;base64,new' }
  fetch.mockResolvedValue(updated); mockOnline = true
  await rerender({})
  await act(async () => { await Promise.resolve() })
  expect(useAuthStore.getState().user).toEqual(updated)
  expect(readProfileCache(mockDb)).toEqual(updated)
})
it('retries when returning to foreground after an initial network error', async () => {
  const subscribe = jest.spyOn(AppState, 'addEventListener')
  mockOnline = true; fetch.mockRejectedValueOnce(new Error('offline'))
  await renderHook(() => useProfileRefresh())
  expect(useAuthStore.getState().user).toBeNull()
  const handler = subscribe.mock.calls.find(([event]) => event === 'change')![1]
  await act(async () => { handler('active'); await Promise.resolve() })
  expect(useAuthStore.getState().user).toEqual(user)
  subscribe.mockRestore()
})
