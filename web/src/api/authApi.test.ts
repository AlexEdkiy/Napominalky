import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from './authApi'
import { apiClient } from './client'

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}))

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
