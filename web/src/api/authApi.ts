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
