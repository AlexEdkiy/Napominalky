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
}

export const useAuthStore = create<AuthState>((set) => ({
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
}))
