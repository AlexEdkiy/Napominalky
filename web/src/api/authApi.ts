import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types/auth'

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload)
    return data.data
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload)
    return data.data
  },

  logout: async (): Promise<void> => {
    await apiClient.delete('/auth/logout')
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me')
    return data.data
  },

  /** Обновление профиля (только имя; email не редактируется). */
  updateProfile: async (name: string): Promise<User> => {
    const { data } = await apiClient.patch<ApiResponse<User>>('/auth/me', { name })
    return data.data
  },

  /**
   * Загрузка аватара (multipart, поле `avatar`).
   * Файл должен быть ужат на клиенте (см. utils/image.ts) — серверный лимит 512 КБ.
   * Content-Type multipart/form-data с boundary axios выставит автоматически.
   */
  uploadAvatar: async (file: Blob): Promise<User> => {
    const formData = new FormData()
    formData.append('avatar', file, 'avatar.jpg')
    const { data } = await apiClient.post<ApiResponse<User>>('/auth/me/avatar', formData)
    return data.data
  },

  deleteAvatar: async (): Promise<User> => {
    const { data } = await apiClient.delete<ApiResponse<User>>('/auth/me/avatar')
    return data.data
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/account')
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/auth/password/forgot', payload)
    return data
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/auth/password/reset', payload)
    return data
  },
}
