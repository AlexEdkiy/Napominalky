import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from './authStore'
import type { User } from '@/types/auth'

const user: User = {
  uuid: 'u-1',
  name: 'Ivan',
  email: 'ivan@example.com',
  is_admin: false,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('is unauthenticated by default', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('setToken persists the token to localStorage', () => {
    const auth = useAuthStore()
    auth.setToken('abc123')
    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('auth_token')).toBe('abc123')
  })

  it('setToken(null) clears the token from localStorage', () => {
    const auth = useAuthStore()
    auth.setToken('abc123')
    auth.setToken(null)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('restores the token from localStorage on init', () => {
    localStorage.setItem('auth_token', 'restored')
    setActivePinia(createPinia())
    const auth = useAuthStore()
    expect(auth.token).toBe('restored')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('setUser drives the isAdmin getter', () => {
    const auth = useAuthStore()
    expect(auth.isAdmin).toBe(false)
    auth.setUser({ ...user, is_admin: true })
    expect(auth.isAdmin).toBe(true)
  })

  it('logout clears local state without calling API when no token', async () => {
    const auth = useAuthStore()
    auth.setUser(user)
    await auth.logout()
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })
})

vi.mock('@/api/authApi', () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))
