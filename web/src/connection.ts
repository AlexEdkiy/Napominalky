import { readonly, ref } from 'vue'
import { isAxiosError } from 'axios'

const unavailable = ref(false)
const checking = ref(false)
const recoveryCount = ref(0)
let generation = 0
let pending: Promise<boolean> | null = null

export function reportConnectionLost(): void {
  generation += 1
  unavailable.value = true
}

/** HTTP responses and cancelled requests retain their normal error handling. */
export function reportConnectionError(error: unknown): void {
  if (isAxiosError(error) && !error.response &&
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')) {
    reportConnectionLost()
  }
}

/** Read-only probe, deliberately outside Axios/auth interceptors; never replays a write. */
export function retryConnection(): Promise<boolean> {
  if (pending) return pending
  checking.value = true
  const attempt = generation
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 6000)
  pending = (async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/auth/me`, {
        headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'omit',
        signal: controller.signal,
      })
      // A captive portal/HTML login or a server outage is not a working API.
      if (![200, 401].includes(response.status) ||
        !response.headers.get('content-type')?.includes('application/json')) throw new Error('API unavailable')
      if (attempt !== generation) return false
      const wasUnavailable = unavailable.value
      unavailable.value = false
      if (wasUnavailable) recoveryCount.value += 1
      return true
    } catch {
      reportConnectionLost()
      return false
    } finally {
      window.clearTimeout(timer)
      checking.value = false
      pending = null
    }
  })()
  return pending
}

export function setupConnectionMonitoring(): () => void {
  const online = () => { if (unavailable.value) void retryConnection() }
  window.addEventListener('offline', reportConnectionLost)
  window.addEventListener('online', online)
  if (!navigator.onLine) reportConnectionLost()
  return () => {
    window.removeEventListener('offline', reportConnectionLost)
    window.removeEventListener('online', online)
  }
}

export function useConnection() {
  return { unavailable: readonly(unavailable), checking: readonly(checking),
    recoveryCount: readonly(recoveryCount), retryConnection }
}
