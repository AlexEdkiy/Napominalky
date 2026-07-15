import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from './authApi'
import { apiClient } from './client'
import type { User } from '@/types/auth'

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}))

const user: User = {
  uuid: 'u-1',
  name: 'Иван',
  email: 'user@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  avatar: null,
}

describe('authApi.updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('patches /auth/me with the name and returns the updated user', async () => {
    const updated = { ...user, name: 'Пётр' }
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { data: updated } })

    const result = await authApi.updateProfile('Пётр')

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', { name: 'Пётр' })
    expect(result).toEqual(updated)
  })

  it('propagates a 422 validation error', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error('422'))

    await expect(authApi.updateProfile('')).rejects.toThrow('422')
  })
})

describe('authApi.uploadAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts multipart FormData with the avatar field to /auth/me/avatar', async () => {
    const updated = { ...user, avatar: 'data:image/jpeg;base64,abc' }
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: updated } })
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })

    const result = await authApi.uploadAvatar(blob)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/me/avatar', expect.any(FormData))
    const formData = vi.mocked(apiClient.post).mock.calls[0]?.[1] as FormData
    const sent = formData.get('avatar')
    expect(sent).toBeInstanceOf(File)
    expect((sent as File).type).toBe('image/jpeg')
    expect(result.avatar).toBe('data:image/jpeg;base64,abc')
  })

  it('propagates an upload error', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('413'))

    await expect(authApi.uploadAvatar(new Blob(['x']))).rejects.toThrow('413')
  })
})

describe('authApi.deleteAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes /auth/me/avatar and returns the user without an avatar', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { data: user } })

    const result = await authApi.deleteAvatar()

    expect(apiClient.delete).toHaveBeenCalledWith('/auth/me/avatar')
    expect(result.avatar).toBeNull()
  })
})

describe('authApi.forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to /auth/password/forgot with the email payload', async () => {
    const message = 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.'
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message } })

    const result = await authApi.forgotPassword({ email: 'user@example.com' })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/password/forgot',
      { email: 'user@example.com' },
    )
    expect(result.message).toBe(message)
  })
})

describe('authApi.resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to /auth/password/reset with the full payload', async () => {
    const message = 'Пароль обновлён. Войдите с новым паролем.'
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message } })

    const payload = {
      email: 'user@example.com',
      token: 'tok123',
      password: 'newPass123',
      password_confirmation: 'newPass123',
    }
    const result = await authApi.resetPassword(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/password/reset', payload)
    expect(result.message).toBe(message)
  })

  it('propagates the error on API failure', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('422'))

    await expect(
      authApi.resetPassword({
        email: 'user@example.com',
        token: 'bad',
        password: 'pass',
        password_confirmation: 'pass',
      }),
    ).rejects.toThrow('422')
  })
})
