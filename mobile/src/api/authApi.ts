import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegistrationResponse,
  User,
} from '@/types/auth'

export const authApi = {
  register: async (payload: RegisterPayload): Promise<RegistrationResponse> => {
    const { data } = await apiClient.post<ApiResponse<RegistrationResponse>>(
      'auth/register',
      payload,
    )
    return data.data
  },

  resendVerification: async (payload: LoginPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('auth/email/resend', payload)
    return data
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
      'auth/login',
      payload,
    )
    return data.data
  },

  logout: async (token?: string): Promise<void> => {
    await apiClient.delete('auth/logout', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('auth/me')
    return data.data
  },
}
