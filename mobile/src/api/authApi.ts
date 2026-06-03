import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types/auth'

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
      'auth/register',
      payload,
    )
    return data.data
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
      'auth/login',
      payload,
    )
    return data.data
  },

  logout: async (): Promise<void> => {
    await apiClient.delete('auth/logout')
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('auth/me')
    return data.data
  },
}
