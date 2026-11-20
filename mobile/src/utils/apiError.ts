import { t } from '@/i18n'
import { isAxiosError } from 'axios'

import type { ApiError } from '@/types/api'

const GENERIC_MESSAGE = 'Что-то пошло не так. Попробуйте позже.'
const NETWORK_MESSAGE = 'Нет соединения с сервером.'

export function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiError>(error)) {
    return t(GENERIC_MESSAGE)
  }
  if (!error.response) {
    return t(NETWORK_MESSAGE)
  }
  return t(error.response.data?.message ?? GENERIC_MESSAGE)
}

export function getFieldErrors(error: unknown): Record<string, string[]> {
  if (!isAxiosError<ApiError>(error) || error.response?.status !== 422) {
    return {}
  }
  return Object.fromEntries(Object.entries(error.response.data?.errors ?? {})
    .map(([field, messages]) => [field, messages.map((message) => t(message))]))
}

export function requiresEmailVerification(error: unknown): boolean {
  return isAxiosError<{ code?: string }>(error)
    && error.response?.status === 403
    && error.response.data?.code === 'email_verification_required'
}
