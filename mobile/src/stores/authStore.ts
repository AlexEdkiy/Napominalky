import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

import type { User } from '@/types/auth'

export const TOKEN_KEY = 'auth_token'
export const TOKEN_SAVED_AT_KEY = 'auth_token_saved_at'
/** Срок жизни токена в миллисекундах (24 часа). */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

let profileRequest: { token: string; promise: Promise<void> } | null = null

interface AuthState {
  token: string | null
  user: User | null
  guestMode: boolean
  syncEnabled: boolean
  isHydrated: boolean
  profileLoading: boolean
  profileError: string | null
  setToken: (token: string) => Promise<void>
  setUser: (user: User) => void
  setGuestMode: (guestMode: boolean) => void
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  rehydrateUser: (fetchUser: () => Promise<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  guestMode: false,
  syncEnabled: false,
  isHydrated: false,
  profileLoading: false,
  profileError: null,

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
    // Stop sync and invalidate profile replies before waiting for native storage.
    set({ token: null, user: null, syncEnabled: false, profileLoading: false, profileError: null })
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(TOKEN_SAVED_AT_KEY)
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
