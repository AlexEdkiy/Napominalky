import axios from 'axios'

/** Параметры экспоненциального backoff (FR-36). */
export interface BackoffOptions {
  /** Максимум попыток (включая первую). По умолчанию 5. */
  maxAttempts?: number
  /** Базовая задержка первой повторной попытки, мс. По умолчанию 1000. */
  baseDelayMs?: number
  /** Стоит ли повторять при данной ошибке. По умолчанию isNetworkError. */
  isRetryable?: (error: unknown) => boolean
  /** Функция задержки (выносится для тестируемости). */
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BASE_DELAY_MS = 1000

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Ретраиемой считается сетевая/таймаут-ошибка (axios без response) или
 * серверная 5xx. Клиентские 4xx и любые иные ошибки не повторяются.
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  if (status === undefined) return true
  return status >= 500 && status <= 599
}

/**
 * Выполняет fn с экспоненциальным backoff: задержки 1s, 2s, 4s, 8s между
 * попытками (baseDelay × 2^n), максимум maxAttempts попыток. Повторяет только
 * ретраиемые ошибки; иначе бросает сразу. После исчерпания попыток бросает
 * последнюю ошибку.
 */
export const withBackoff = async <T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {},
): Promise<T> => {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const isRetryable = opts.isRetryable ?? isNetworkError
  const sleep = opts.sleep ?? defaultSleep

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const isLast = attempt === maxAttempts - 1
      if (isLast || !isRetryable(error)) throw error
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
  throw lastError
}
