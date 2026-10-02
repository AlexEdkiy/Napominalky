import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'

import { router } from '@/router'
import { reportConnectionError } from '@/connection'
import { useAuthStore } from '@/stores/authStore'

const baseURL = `${import.meta.env.VITE_API_URL}/api/v1`

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore()
  if (token !== null) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Multipart-загрузки (FormData, напр. аватар): снимаем дефолтный
  // application/json, чтобы браузер сам выставил Content-Type:
  // multipart/form-data с boundary. Иначе сервер не распознаёт файл
  // (валидация «The avatar field is required»).
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    reportConnectionError(error)
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      // Локальная очистка без повторного запроса к API (он и вернул 401).
      auth.setToken(null)
      auth.setUser(null)
      if (router.currentRoute.value.name !== 'login') {
        await router.push({ name: 'login' })
      }
    }
    return Promise.reject(error)
  },
)
