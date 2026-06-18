import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

import type { User } from '@/types/auth'

const TOKEN_KEY = 'auth_token'

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
    set({ token: null, user: null, syncEnabled: false })
  },

  hydrate: async (): Promise<void> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    set({ token: token ?? null, isHydrated: true })
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
