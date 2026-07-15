import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from './authStore'
import { authApi } from '@/api/authApi'
import type { User } from '@/types/auth'

const user: User = {
  uuid: 'u-1',
  name: 'Ivan',
  email: 'ivan@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  avatar: null,
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

  it('setUser drives the isSuperAdmin getter', () => {
    const auth = useAuthStore()
    expect(auth.isSuperAdmin).toBe(false)
    auth.setUser({ ...user, is_admin: true, is_super_admin: true })
    expect(auth.isSuperAdmin).toBe(true)
  })

  it('updateProfile stores the user returned by the API (sidebar sees the new name)', async () => {
    const auth = useAuthStore()
    auth.setUser(user)
    vi.mocked(authApi.updateProfile).mockResolvedValue({ ...user, name: 'Пётр' })

    await auth.updateProfile('Пётр')

    expect(authApi.updateProfile).toHaveBeenCalledWith('Пётр')
    expect(auth.user?.name).toBe('Пётр')
  })

  it('uploadAvatar stores the user with the fresh data-URI avatar', async () => {
    const auth = useAuthStore()
    auth.setUser(user)
    const avatar = 'data:image/jpeg;base64,abc'
    vi.mocked(authApi.uploadAvatar).mockResolvedValue({ ...user, avatar })
    const blob = new Blob(['x'], { type: 'image/jpeg' })

    await auth.uploadAvatar(blob)

    expect(authApi.uploadAvatar).toHaveBeenCalledWith(blob)
    expect(auth.user?.avatar).toBe(avatar)
  })

  it('deleteAvatar stores the user with avatar=null', async () => {
    const auth = useAuthStore()
    auth.setUser({ ...user, avatar: 'data:image/jpeg;base64,abc' })
    vi.mocked(authApi.deleteAvatar).mockResolvedValue({ ...user, avatar: null })

    await auth.deleteAvatar()

    expect(auth.user?.avatar).toBeNull()
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
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))
