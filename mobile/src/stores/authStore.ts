import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

import type { User } from '@/types/auth'

export const TOKEN_KEY = 'auth_token'
export const TOKEN_SAVED_AT_KEY = 'auth_token_saved_at'
export const ACCOUNT_KEY = 'auth_account_uuid'

// Serialize native writes so an old logout cannot delete a newer login.
let credentialsWrite = Promise.resolve()
const writeCredentials = (write: () => Promise<void>): Promise<void> => {
  const next = credentialsWrite.then(write)
  credentialsWrite = next.catch(() => {})
  return next
}

let profileRequest: { token: string; promise: Promise<void> } | null = null

interface AuthState {
  token: string | null
  user: User | null
  accountId: string | null
  isSwitching: boolean
  sessionExpired: boolean
  navigationTarget: 'home' | 'login' | null
  guestMode: boolean
  syncEnabled: boolean
  isHydrated: boolean
  profileLoading: boolean
  profileError: string | null
  setToken: (token: string) => Promise<void>
  setUser: (user: User) => void
  setGuestMode: (guestMode: boolean) => void
  logout: (expired?: boolean) => Promise<void>
  hydrate: () => Promise<void>
  rehydrateUser: (fetchUser: () => Promise<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  accountId: null,
  isSwitching: false,
  sessionExpired: false,
  navigationTarget: null,
  guestMode: false,
  syncEnabled: false,
  isHydrated: false,
  profileLoading: false,
  profileError: null,

  setToken: async (token: string): Promise<void> => {
    const accountId = get().accountId
    await writeCredentials(async () => {
      // Owner first: a crash must never pair a new token with the previous owner.
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      if (accountId) await SecureStore.setItemAsync(ACCOUNT_KEY, accountId)
      else await SecureStore.deleteItemAsync(ACCOUNT_KEY)
      await SecureStore.setItemAsync(TOKEN_KEY, token)
    })
    set({ token, guestMode: false, sessionExpired: false, navigationTarget: 'home' })
  },

  setUser: (user: User): void => {
    set({ user, accountId: user.uuid, syncEnabled: user.sync_enabled })
  },

  setGuestMode: (guestMode: boolean): void => {
    set({ guestMode, sessionExpired: false, navigationTarget: guestMode ? 'home' : null })
  },

  logout: async (expired = false): Promise<void> => {
    set({ token: null, user: null, accountId: null, guestMode: false, syncEnabled: false,
      profileLoading: false, profileError: null, sessionExpired: expired, navigationTarget: 'login' })
    await writeCredentials(async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(TOKEN_SAVED_AT_KEY)
      await SecureStore.deleteItemAsync(ACCOUNT_KEY)
    })
  },

  hydrate: async (): Promise<void> => {
    await credentialsWrite
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    const accountId = token ? await SecureStore.getItemAsync(ACCOUNT_KEY) : null
    // Only the server can reject an expired/revoked token. Offline is not logout.
    set({ token, accountId, isHydrated: true })
  },

  rehydrateUser: async (fetchUser) => {
    const token = get().token
    if (token === null) return
    if (profileRequest?.token === token) return profileRequest.promise
    const request = { token, promise: Promise.resolve() }
    profileRequest = request
    set({ profileLoading: true, profileError: null })
    request.promise = (async () => {
      try {
        const user = await fetchUser()
        if (get().token === token) set({ user, syncEnabled: user.sync_enabled })
      } catch {
        if (get().token === token) set({ profileError: 'Не удалось обновить профиль. Проверьте подключение.' })
      } finally {
        if (get().token === token) set({ profileLoading: false })
        if (profileRequest === request) profileRequest = null
      }
    })()
    return request.promise
  },
}))
