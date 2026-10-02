import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AxiosError, CanceledError } from 'axios'
import { reportConnectionError, reportConnectionLost, retryConnection, setupConnectionMonitoring, useConnection } from './connection'

const healthy = () => Promise.resolve(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }))
const state = useConnection()
let stop: (() => void) | undefined
beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn(healthy))
  await retryConnection()
  vi.mocked(fetch).mockClear()
})
afterEach(() => {
  stop?.(); stop = undefined
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers()
})

it('detects offline immediately, probes on online and removes listeners', async () => {
  stop = setupConnectionMonitoring()
  const count = state.recoveryCount.value
  window.dispatchEvent(new Event('offline'))
  expect(state.unavailable.value).toBe(true)
  window.dispatchEvent(new Event('online'))
  await vi.waitFor(() => expect(state.unavailable.value).toBe(false))
  expect(state.recoveryCount.value).toBe(count + 1)
  stop()
  window.dispatchEvent(new Event('offline'))
  expect(state.unavailable.value).toBe(false)
})

it('detects initial offline state', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  stop = setupConnectionMonitoring()
  expect(state.unavailable.value).toBe(true)
})

it('shows network failures, but ignores cancellation, validation, 401 and HTTP 500', async () => {
  reportConnectionError(new CanceledError())
  reportConnectionError(new Error('ordinary error'))
  for (const status of [401, 422, 500]) {
    reportConnectionError(Object.assign(new AxiosError('response'), { response: { status } }))
  }
  expect(state.unavailable.value).toBe(false)
  for (const code of ['ERR_NETWORK', 'ETIMEDOUT', 'ECONNABORTED']) {
    reportConnectionError(new AxiosError('network', code))
    expect(state.unavailable.value).toBe(true)
    await retryConnection()
  }
})

it('uses one read-only unauthenticated probe and preserves the session', async () => {
  localStorage.setItem('auth_token', 'fixture-token')
  reportConnectionLost()
  let resolve!: (response: Response) => void
  vi.mocked(fetch).mockReturnValue(new Promise<Response>(r => { resolve = r }))
  const first = retryConnection(), second = retryConnection()
  expect(first).toBe(second)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/me'), expect.objectContaining({
    credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' },
  }))
  expect(state.checking.value).toBe(true)
  resolve(await healthy())
  expect(await first).toBe(true)
  expect(state.checking.value).toBe(false)
  expect(localStorage.getItem('auth_token')).toBe('fixture-token')
  localStorage.clear()
})

it('keeps the page on failed probe, server outage or captive portal', async () => {
  for (const response of [new Response('', { status: 503 }), new Response('<html>login</html>', { status: 200 })]) {
    vi.mocked(fetch).mockResolvedValueOnce(response)
    expect(await retryConnection()).toBe(false)
    expect(state.unavailable.value).toBe(true)
  }
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
  expect(await retryConnection()).toBe(false)
  expect(state.checking.value).toBe(false)
})

it('does not accept stale success after a new disconnect', async () => {
  let resolve!: (response: Response) => void
  vi.mocked(fetch).mockReturnValue(new Promise<Response>(r => { resolve = r }))
  reportConnectionLost()
  const attempt = retryConnection()
  reportConnectionLost()
  resolve(await healthy())
  expect(await attempt).toBe(false)
  expect(state.unavailable.value).toBe(true)
})

it('aborts a stuck probe after six seconds and allows another attempt', async () => {
  vi.useFakeTimers()
  vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))
  }))
  const attempt = retryConnection()
  await vi.advanceTimersByTimeAsync(6000)
  expect(await attempt).toBe(false)
  expect(state.checking.value).toBe(false)
  expect(await retryConnection()).toBe(true)
})
