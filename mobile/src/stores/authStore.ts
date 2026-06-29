import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

import type { User } from '@/types/auth'

export const TOKEN_KEY = 'auth_token'
export const TOKEN_SAVED_AT_KEY = 'auth_token_saved_at'
/** Срок жизни токена в миллисекундах (24 часа). */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

interface AuthState {
  token: string | null
  user: User | null
  guestMode: boolean
  syncEnabled: boolean
  isHydrated: boolean
  setToken: (token: string) => Promise<void>
  setUser: (user: User) => void
  setGuestMode: (guestMode: boolean) => void
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  /**
   * After hydrate(), if token is present and user is null, call this with
   * authApi.getMe to fetch the current user and set syncEnabled.
   * Accepts the fetch function as a parameter to avoid circular imports
   * (authApi → client → authStore) and to make the store easily testable.
   *
   * Error handling:
   *  - 401: axios interceptor already calls logout(); isHydrated remains true.
   *  - Network / transient errors: token kept, user stays null; sync skipped until
   *    the next app session or manual trigger.
   */
  rehydrateUser: (fetchUser: () => Promise<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  guestMode: false,
  syncEnabled: false,
  isHydrated: false,

  setToken: async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(TOKEN_SAVED_AT_KEY, String(Date.now()))
    set({ token, guestMode: false })
  },

  setUser: (user: User): void => {
    set({ user, syncEnabled: user.sync_enabled })
  },

  setGuestMode: (guestMode: boolean): void => {
    set({ guestMode })
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(TOKEN_SAVED_AT_KEY)
    set({ token: null, user: null, syncEnabled: false })
  },

  hydrate: async (): Promise<void> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (token === null) {
      set({ token: null, isHydrated: true })
      return
    }

    const savedAtRaw = await SecureStore.getItemAsync(TOKEN_SAVED_AT_KEY)
    const savedAt = savedAtRaw !== null ? Number(savedAtRaw) : null
    const isExpired =
      savedAt === null || Number.isNaN(savedAt) || Date.now() - savedAt > TOKEN_TTL_MS

    if (isExpired) {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(TOKEN_SAVED_AT_KEY)
      set({ token: null, user: null, isHydrated: true })
      return
    }

    set({ token, isHydrated: true })
  },

  rehydrateUser: async (fetchUser: () => Promise<User>): Promise<void> => {
    const { token, user } = get()
    if (token === null || user !== null) return

    try {
      const fetchedUser = await fetchUser()
      set({ user: fetchedUser, syncEnabled: fetchedUser.sync_enabled })
    } catch (error: unknown) {
      const status =
        (error as { response?: { status?: number } } | null)?.response?.status
      if (status === 401) {
        // Interceptor already called logout() → token and user cleared.
        return
      }
      // Network / transient error: keep token, leave user null.
      // Sync engine will be skipped (syncEnabled stays false) until next session.
    }
  },
}))
