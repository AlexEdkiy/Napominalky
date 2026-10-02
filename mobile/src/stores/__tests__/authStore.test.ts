import * as SecureStore from 'expo-secure-store'

import { useAuthStore, TOKEN_KEY, TOKEN_SAVED_AT_KEY, TOKEN_TTL_MS } from '../authStore'
import type { User } from '@/types/auth'

const mockGetItem = SecureStore.getItemAsync as jest.Mock
const mockSetItem = SecureStore.setItemAsync as jest.Mock
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock

const TEST_TOKEN = 'test-bearer-token'

const TEST_USER: User = {
  uuid: 'user-uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  is_admin: false,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
}

function resetStore(): void {
  useAuthStore.setState({
    token: null,
    user: null,
    guestMode: false,
    syncEnabled: false,
    isHydrated: false,
  })
}

beforeEach(() => {
  mockGetItem.mockReset()
  mockSetItem.mockReset()
  mockDeleteItem.mockReset()
  mockGetItem.mockResolvedValue(null)
  mockSetItem.mockResolvedValue(undefined)
  mockDeleteItem.mockResolvedValue(undefined)
  resetStore()
})

// ---------------------------------------------------------------------------
// hydrate()
// ---------------------------------------------------------------------------

describe('authStore — hydrate', () => {
  it('restores token and sets isHydrated true when token exists', async () => {
    // Первый вызов = токен, второй = метка времени (свежая)
    mockGetItem
      .mockResolvedValueOnce(TEST_TOKEN)
      .mockResolvedValueOnce(String(Date.now()))
    await useAuthStore.getState().hydrate()
    const state = useAuthStore.getState()
    expect(state.token).toBe(TEST_TOKEN)
    expect(state.isHydrated).toBe(true)
  })

  it('sets token null and isHydrated true when no token stored', async () => {
    mockGetItem.mockResolvedValue(null)
    await useAuthStore.getState().hydrate()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isHydrated).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// rehydrateUser() — dependency injection: fetchUser passed as argument
// ---------------------------------------------------------------------------

describe('authStore — rehydrateUser — token present, fetchUser succeeds', () => {
  it('calls fetchUser and sets user + syncEnabled from user.sync_enabled=true', async () => {
    useAuthStore.setState({ token: TEST_TOKEN })
    const fetchUser = jest.fn().mockResolvedValue(TEST_USER)

    await useAuthStore.getState().rehydrateUser(fetchUser)

    const state = useAuthStore.getState()
    expect(fetchUser).toHaveBeenCalledTimes(1)
    expect(state.user).toEqual(TEST_USER)
    expect(state.syncEnabled).toBe(true)
  })

  it('sets syncEnabled false when user.sync_enabled is false', async () => {
    const userSyncOff: User = { ...TEST_USER, sync_enabled: false }
    useAuthStore.setState({ token: TEST_TOKEN })
    const fetchUser = jest.fn().mockResolvedValue(userSyncOff)

    await useAuthStore.getState().rehydrateUser(fetchUser)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(userSyncOff)
    expect(state.syncEnabled).toBe(false)
  })
})

describe('authStore — rehydrateUser — skips fetch when no token', () => {
  it('does not call fetchUser when token is null', async () => {
    useAuthStore.setState({ token: null })
    const fetchUser = jest.fn()

    await useAuthStore.getState().rehydrateUser(fetchUser)

    expect(fetchUser).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('refreshes an already loaded profile', async () => {
    useAuthStore.setState({ token: TEST_TOKEN, user: TEST_USER })
    const fetchUser = jest.fn().mockResolvedValue({ ...TEST_USER, name: 'Updated', avatar: 'data:image/png;base64,fixture' })

    await useAuthStore.getState().rehydrateUser(fetchUser)

    expect(fetchUser).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().user?.name).toBe('Updated')
    expect(useAuthStore.getState().user?.avatar).toContain('data:image/png')
  })
})

describe('authStore — rehydrateUser — 401 (invalid token)', () => {
  it('interceptor clears session; token null, user null after rehydrateUser', async () => {
    useAuthStore.setState({ token: TEST_TOKEN })

    const error401 = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    })

    // Simulate axios interceptor: it calls logout() then rejects.
    const fetchUser = jest.fn().mockImplementation(async () => {
      await useAuthStore.getState().logout()
      throw error401
    })

    await useAuthStore.getState().rehydrateUser(fetchUser)

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.syncEnabled).toBe(false)
  })
})

describe('authStore — rehydrateUser — network error (offline)', () => {
  it('keeps token, leaves user null, does not call logout', async () => {
    useAuthStore.setState({ token: TEST_TOKEN })

    const networkError = Object.assign(new Error('Network Error'), {
      response: undefined,
    })
    const fetchUser = jest.fn().mockRejectedValue(networkError)

    await useAuthStore.getState().rehydrateUser(fetchUser)

    const state = useAuthStore.getState()
    expect(state.token).toBe(TEST_TOKEN)
    expect(state.user).toBeNull()
    expect(state.syncEnabled).toBe(false)
    // logout() was NOT called — SecureStore.deleteItemAsync not invoked
    expect(mockDeleteItem).not.toHaveBeenCalled()
  })

  it('does not throw on network error', async () => {
    useAuthStore.setState({ token: TEST_TOKEN })
    const fetchUser = jest.fn().mockRejectedValue(new Error('Network Error'))
    await expect(
      useAuthStore.getState().rehydrateUser(fetchUser),
    ).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// setToken() — сохраняет метку времени
// ---------------------------------------------------------------------------

describe('authStore — setToken', () => {
  it('saves token and timestamp to SecureStore', async () => {
    await useAuthStore.getState().setToken(TEST_TOKEN)

    expect(mockSetItem).toHaveBeenCalledWith(TOKEN_KEY, TEST_TOKEN)
    expect(mockSetItem).toHaveBeenCalledWith(
      TOKEN_SAVED_AT_KEY,
      expect.stringMatching(/^\d+$/),
    )
  })

  it('clears guestMode on setToken', async () => {
    useAuthStore.setState({ guestMode: true })
    await useAuthStore.getState().setToken(TEST_TOKEN)
    expect(useAuthStore.getState().guestMode).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hydrate() — TTL 24ч
// ---------------------------------------------------------------------------

describe('authStore — hydrate — token TTL', () => {
  it('restores fresh token (savedAt = now)', async () => {
    // getItemAsync: первый вызов = токен, второй = метка времени
    mockGetItem
      .mockResolvedValueOnce(TEST_TOKEN)
      .mockResolvedValueOnce(String(Date.now()))

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState().token).toBe(TEST_TOKEN)
    expect(useAuthStore.getState().isHydrated).toBe(true)
  })

  it('expires token older than 24h: token=null, deletes SecureStore keys', async () => {
    const expiredAt = Date.now() - TOKEN_TTL_MS - 1
    mockGetItem
      .mockResolvedValueOnce(TEST_TOKEN)
      .mockResolvedValueOnce(String(expiredAt))

    await useAuthStore.getState().hydrate()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isHydrated).toBe(true)
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY)
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_SAVED_AT_KEY)
  })

  it('expires token when savedAt is missing (no timestamp key)', async () => {
    mockGetItem
      .mockResolvedValueOnce(TEST_TOKEN)
      .mockResolvedValueOnce(null)

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState().token).toBeNull()
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY)
  })

  it('does NOT clear local DB on token expiry — only SecureStore keys removed', async () => {
    // Истёкший токен → только ключи из SecureStore, не данные в SQLite.
    const expiredAt = Date.now() - TOKEN_TTL_MS - 1
    mockGetItem
      .mockResolvedValueOnce(TEST_TOKEN)
      .mockResolvedValueOnce(String(expiredAt))

    // Если бы resetLocalData вызвался — он бросил бы, т.к. db не передаётся.
    // Тест просто проверяет, что hydrate резолвится без ошибок.
    await expect(useAuthStore.getState().hydrate()).resolves.toBeUndefined()
  })
})


it.each(['logout', 'switch'])('ignores an old profile response after %s', async (action) => {
  useAuthStore.setState({ token: TEST_TOKEN, user: TEST_USER })
  let resolve!: (user: User) => void
  const pending = useAuthStore.getState().rehydrateUser(() => new Promise((done) => { resolve = done }))
  if (action === 'logout') await useAuthStore.getState().logout()
  else useAuthStore.setState({ token: 'another-token', user: null, syncEnabled: false })
  resolve(TEST_USER)
  await pending
  expect(useAuthStore.getState().user).toBeNull()
  expect(useAuthStore.getState().syncEnabled).toBe(false)
})

it('retries after an offline start and deduplicates simultaneous refreshes', async () => {
  useAuthStore.setState({ token: TEST_TOKEN })
  await useAuthStore.getState().rehydrateUser(jest.fn().mockRejectedValue(new Error('offline')))
  expect(useAuthStore.getState().profileError).toBeTruthy()
  const fetch = jest.fn().mockResolvedValue(TEST_USER)
  await Promise.all([useAuthStore.getState().rehydrateUser(fetch), useAuthStore.getState().rehydrateUser(fetch)])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState().profileError).toBeNull()
  expect(useAuthStore.getState().user).toEqual(TEST_USER)
})
