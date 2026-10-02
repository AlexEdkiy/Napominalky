import * as SecureStore from 'expo-secure-store'

import { useSettingsStore } from '../settingsStore'

const mockGetItem = SecureStore.getItemAsync as jest.Mock
const mockSetItem = SecureStore.setItemAsync as jest.Mock

beforeEach(() => {
  mockGetItem.mockReset()
  mockSetItem.mockReset()
  mockGetItem.mockResolvedValue(null)
  mockSetItem.mockResolvedValue(undefined)
  useSettingsStore.setState({
    theme: 'system',
    notificationsEnabled: true,
    syncEnabled: false,
    isHydrated: false,
  })
})

describe('settingsStore — defaults', () => {
  it('has correct default values', () => {
    const state = useSettingsStore.getState()
    expect(state.theme).toBe('system')
    expect(state.notificationsEnabled).toBe(true)
    expect(state.syncEnabled).toBe(false)
    expect(state.isHydrated).toBe(false)
  })
})

describe('settingsStore — setTheme', () => {
  it('updates theme and persists', async () => {
    await useSettingsStore.getState().setTheme('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(mockSetItem).toHaveBeenCalledTimes(1)
  })
})

describe('settingsStore — setNotificationsEnabled', () => {
  it('toggles notificationsEnabled and persists', async () => {
    await useSettingsStore.getState().setNotificationsEnabled(false)
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false)
    expect(mockSetItem).toHaveBeenCalledTimes(1)
  })
})

describe('settingsStore — setSyncEnabled', () => {
  it('sets syncEnabled and persists', async () => {
    await useSettingsStore.getState().setSyncEnabled(true)
    expect(useSettingsStore.getState().syncEnabled).toBe(true)
    expect(mockSetItem).toHaveBeenCalledTimes(1)
  })
})

describe('settingsStore — hydrate', () => {
  it('sets isHydrated true when no stored data', async () => {
    await useSettingsStore.getState().hydrate()
    expect(useSettingsStore.getState().isHydrated).toBe(true)
    expect(useSettingsStore.getState().theme).toBe('system')
  })

  it('restores stored settings on hydrate', async () => {
    const stored = JSON.stringify({ theme: 'dark', notificationsEnabled: false, syncEnabled: true })
    mockGetItem.mockResolvedValue(stored)
    await useSettingsStore.getState().hydrate()
    const state = useSettingsStore.getState()
    expect(state.theme).toBe('dark')
    expect(state.notificationsEnabled).toBe(false)
    expect(state.syncEnabled).toBe(true)
    expect(state.isHydrated).toBe(true)
  })

  it('falls back to defaults for invalid theme value', async () => {
    const stored = JSON.stringify({ theme: 'invalid', notificationsEnabled: true, syncEnabled: false })
    mockGetItem.mockResolvedValue(stored)
    await useSettingsStore.getState().hydrate()
    expect(useSettingsStore.getState().theme).toBe('system')
  })
})


it('recovers from malformed persisted settings without enabling sync', async () => {
  mockGetItem.mockResolvedValue('{broken')
  await useSettingsStore.getState().hydrate()
  expect(useSettingsStore.getState().isHydrated).toBe(true)
  expect(useSettingsStore.getState().syncEnabled).toBe(false)
})
it('persists rapid toggle changes in order', async () => {
  const off = useSettingsStore.getState().setSyncEnabled(false)
  const on = useSettingsStore.getState().setSyncEnabled(true)
  await Promise.all([off, on])
  expect(JSON.parse(mockSetItem.mock.calls.at(-1)[1]).syncEnabled).toBe(true)
})
