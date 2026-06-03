import axios, { type AxiosError } from 'axios'

import { Config } from '@/constants/Config'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: `${Config.API_BASE_URL}/api/v1`,
  headers: { Accept: 'application/json' },
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      void useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
