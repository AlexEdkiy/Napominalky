jest.mock('@/api/settingsApi', () => ({ settingsApi: { updateSyncEnabled: jest.fn() } }))
import React from 'react'
import { act, renderHook, cleanup } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettings } from '../useSettings'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { settingsApi } from '@/api/settingsApi'
import type { User } from '@/types/auth'

const user: User = { uuid: 'a', name: 'Alice', email: 'a@example.com', is_admin: false, sync_enabled: true, created_at: '2026-01-01' }
const update = settingsApi.updateSyncEnabled as jest.MockedFunction<typeof settingsApi.updateSyncEnabled>
let client: QueryClient
const mount = () => renderHook(() => useSettings(), { wrapper: ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client }, children) })
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })
  useAuthStore.setState({ token: 'fixture-token', user, syncEnabled: true })
  useSettingsStore.setState({ syncEnabled: true, isHydrated: true })
  update.mockReset().mockImplementation(async (enabled) => ({ ...user, sync_enabled: enabled }))
})
afterEach(async () => { await cleanup(); client.clear() })
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 15)) }

it('shows the effective state when server and local settings disagree', async () => {
  useSettingsStore.setState({ syncEnabled: false })
  const { result } = await mount()
  expect(result.current.syncEnabled).toBe(false)
  await act(async () => { result.current.toggleSync(); await flush() })
  expect(update).toHaveBeenCalledWith(true)
  expect(result.current.syncEnabled).toBe(true)
})
it('OFF immediately pauses locally and a network failure cannot enable it again', async () => {
  update.mockRejectedValue(new Error('offline'))
  const { result } = await mount()
  await act(async () => { result.current.toggleSync(); await flush() })
  expect(result.current.syncEnabled).toBe(false)
  expect(useSettingsStore.getState().syncEnabled).toBe(false)
  expect(result.current.syncError).toContain('выключена')
  useAuthStore.getState().setUser(user)
  expect(useSettingsStore.getState().syncEnabled).toBe(false)
})
it('failed ON stays off and can be retried', async () => {
  useSettingsStore.setState({ syncEnabled: false })
  update.mockRejectedValueOnce(new Error('offline'))
  const { result } = await mount()
  await act(async () => { result.current.toggleSync(); await flush() })
  expect(result.current.syncEnabled).toBe(false)
  await act(async () => { result.current.toggleSync(); await flush() })
  expect(result.current.syncEnabled).toBe(true)
})
it('does not apply a settings response to another account', async () => {
  let resolve!: (value: User) => void
  update.mockImplementation(() => new Promise((done) => { resolve = done }))
  const { result } = await mount()
  await act(async () => { result.current.toggleSync(); await flush() })
  await act(async () => {
    useAuthStore.setState({ token: 'other-token', user: null, syncEnabled: false })
    resolve(user); await flush()
  })
  expect(useAuthStore.getState().user).toBeNull()
  expect(useAuthStore.getState().syncEnabled).toBe(false)
})
