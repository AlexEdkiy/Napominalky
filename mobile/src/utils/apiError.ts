import { isAxiosError } from 'axios'

import type { ApiError } from '@/types/api'

const GENERIC_MESSAGE = 'Что-то пошло не так. Попробуйте позже.'
const NETWORK_MESSAGE = 'Нет соединения с сервером.'

export function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiError>(error)) {
    return GENERIC_MESSAGE
  }
  if (!error.response) {
    return NETWORK_MESSAGE
  }
  return error.response.data?.message ?? GENERIC_MESSAGE
}

export function getFieldErrors(error: unknown): Record<string, string[]> {
  if (!isAxiosError<ApiError>(error) || error.response?.status !== 422) {
    return {}
  }
  return error.response.data?.errors ?? {}
}
