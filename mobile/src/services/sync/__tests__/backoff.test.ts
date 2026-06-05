import { AxiosError, AxiosHeaders } from 'axios'

import { isNetworkError, withBackoff } from '../backoff'

/** Собирает мокируемый sleep, фиксирующий запрошенные задержки. */
const createSleep = (): { sleep: (ms: number) => Promise<void>; delays: number[] } => {
  const delays: number[] = []
  return { sleep: async (ms) => void delays.push(ms), delays }
}

/** Сетевая ошибка axios (без response). */
const networkError = (): AxiosError =>
  new AxiosError('Network Error', 'ERR_NETWORK')

/** Ответная ошибка axios с заданным HTTP-статусом. */
const httpError = (status: number): AxiosError => {
  const error = new AxiosError('HTTP Error', 'ERR_BAD_RESPONSE')
  error.response = {
    status,
    statusText: '',
    data: null,
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('isNetworkError', () => {
  it('ретраит сетевую ошибку без response', () => {
    expect(isNetworkError(networkError())).toBe(true)
  })

  it('ретраит 5xx', () => {
    expect(isNetworkError(httpError(503))).toBe(true)
  })

  it('не ретраит 4xx', () => {
    expect(isNetworkError(httpError(409))).toBe(false)
  })

  it('не ретраит не-axios ошибки', () => {
    expect(isNetworkError(new Error('boom'))).toBe(false)
  })
})

describe('withBackoff', () => {
  it('возвращает результат без задержек при успехе', async () => {
    const { sleep, delays } = createSleep()
    const result = await withBackoff(async () => 42, { sleep })
    expect(result).toBe(42)
    expect(delays).toHaveLength(0)
  })

  it('ретраит до maxAttempts и бросает последнюю ошибку', async () => {
    const { sleep, delays } = createSleep()
    const fn = jest.fn(async () => {
      throw networkError()
    })

    await expect(withBackoff(fn, { sleep })).rejects.toBeInstanceOf(AxiosError)
    expect(fn).toHaveBeenCalledTimes(5)
    expect(delays).toEqual([1000, 2000, 4000, 8000])
  })

  it('применяет экспоненциальные задержки и возвращает результат после ретраев', async () => {
    const { sleep, delays } = createSleep()
    let calls = 0
    const fn = async (): Promise<string> => {
      calls += 1
      if (calls < 3) throw networkError()
      return 'ok'
    }

    await expect(withBackoff(fn, { sleep })).resolves.toBe('ok')
    expect(delays).toEqual([1000, 2000])
  })

  it('не ретраит 4xx — бросает сразу', async () => {
    const { sleep, delays } = createSleep()
    const fn = jest.fn(async () => {
      throw httpError(422)
    })

    await expect(withBackoff(fn, { sleep })).rejects.toBeInstanceOf(AxiosError)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toHaveLength(0)
  })
})
