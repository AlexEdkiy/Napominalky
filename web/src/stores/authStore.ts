import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { authApi } from '@/api/authApi'
import type { LoginPayload, RegisterPayload, User } from '@/types/auth'

const TOKEN_STORAGE_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY))
  const user = ref<User | null>(null)

  // Getters
  const isAuthenticated = computed(() => token.value !== null)
  const isAdmin = computed(() => user.value?.is_admin ?? false)
  const isSuperAdmin = computed(() => user.value?.is_super_admin ?? false)

  // Actions
  function setToken(newToken: string | null): void {
    token.value = newToken
    if (newToken !== null) {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }

  function setUser(newUser: User | null): void {
    user.value = newUser
  }

  async function register(payload: RegisterPayload): Promise<void> {
    const auth = await authApi.register(payload)
    setToken(auth.token)
    setUser(auth.user)
  }

  async function login(payload: LoginPayload): Promise<void> {
    const auth = await authApi.login(payload)
    setToken(auth.token)
    setUser(auth.user)
  }

  async function fetchMe(): Promise<void> {
    user.value = await authApi.getMe()
  }

  async function logout(): Promise<void> {
    if (token.value !== null) {
      try {
        await authApi.logout()
      } catch {
        // Токен мог истечь — локальную очистку выполняем в любом случае.
      }
    }
    setToken(null)
    setUser(null)
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    setToken,
    setUser,
    register,
    login,
    fetchMe,
    logout,
  }
})
