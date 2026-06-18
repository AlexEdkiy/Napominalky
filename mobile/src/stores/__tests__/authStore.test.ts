import * as SecureStore from 'expo-secure-store'

import { useAuthStore } from '../authStore'
import type { User } from '@/types/auth'

const mockGetItem = SecureStore.getItemAsync as jest.Mock
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
  mockDeleteItem.mockReset()
  mockGetItem.mockResolvedValue(null)
  mockDeleteItem.mockResolvedValue(undefined)
  resetStore()
})

// ---------------------------------------------------------------------------
// hydrate()
// ---------------------------------------------------------------------------

describe('authStore — hydrate', () => {
  it('restores token and sets isHydrated true when token exists', async () => {
    mockGetItem.mockResolvedValue(TEST_TOKEN)
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

  it('does not call fetchUser when user already loaded', async () => {
    useAuthStore.setState({ token: TEST_TOKEN, user: TEST_USER })
    const fetchUser = jest.fn()

    await useAuthStore.getState().rehydrateUser(fetchUser)

    expect(fetchUser).not.toHaveBeenCalled()
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
