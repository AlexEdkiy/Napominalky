jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}))
jest.mock('@/services/netStatus', () => ({ getIsOnline: jest.fn() }))
jest.mock('../pushChanges', () => ({ pushChanges: jest.fn() }))
jest.mock('../pullChanges', () => ({ pullChanges: jest.fn() }))
jest.mock('../syncMeta', () => ({ setLastSyncedAt: jest.fn() }))

import { useAuthStore } from '@/stores/authStore'
import { getIsOnline } from '@/services/netStatus'
import type { SyncPushResult } from '@/types/sync'
import { pushChanges } from '../pushChanges'
import { pullChanges } from '../pullChanges'

const mockedState = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>
const mockedOnline = getIsOnline as jest.MockedFunction<typeof getIsOnline>
const mockedPush = pushChanges as jest.MockedFunction<typeof pushChanges>
const mockedPull = pullChanges as jest.MockedFunction<typeof pullChanges>

type AuthState = ReturnType<typeof useAuthStore.getState>

const setAuth = (over: Partial<AuthState>): void => {
  mockedState.mockReturnValue({ token: 't', syncEnabled: true, ...over } as AuthState)
}

const pushResult = (applied: string[]): SyncPushResult => ({
  applied,
  conflicts: [],
  cursor: 1,
})

/** Свежий модуль на каждый тест: сбрасывает inFlight и слушателей. */
const loadEngine = (): typeof import('../syncEngine').syncEngine => {
  let engine: typeof import('../syncEngine').syncEngine
  jest.isolateModules(() => {
    engine = require('../syncEngine').syncEngine
  })
  return engine!
}

beforeEach(() => {
  jest.clearAllMocks()
  setAuth({})
  mockedOnline.mockResolvedValue(true)
  mockedPush.mockResolvedValue(pushResult(['a', 'b']))
  mockedPull.mockResolvedValue(undefined)
})

describe('syncEngine.sync — гейт', () => {
  it('отказывает без токена', async () => {
    setAuth({ token: null })
    const result = await loadEngine().sync()
    expect(result).toEqual({ ok: false, error: 'unauthenticated' })
    expect(mockedPush).not.toHaveBeenCalled()
  })

  it('отказывает при выключенной синхронизации без force', async () => {
    setAuth({ syncEnabled: false })
    const result = await loadEngine().sync()
    expect(result.error).toBe('sync_disabled')
    expect(mockedPush).not.toHaveBeenCalled()
  })

  it('отказывает офлайн без force', async () => {
    mockedOnline.mockResolvedValue(false)
    const result = await loadEngine().sync()
    expect(result.error).toBe('offline')
  })

  it('force игнорирует syncEnabled и онлайн', async () => {
    setAuth({ syncEnabled: false })
    mockedOnline.mockResolvedValue(false)
    const result = await loadEngine().sync({ force: true })
    expect(result.ok).toBe(true)
    expect(mockedPush).toHaveBeenCalledTimes(1)
  })
})

describe('syncEngine.sync — выполнение', () => {
  it('идёт push → pull и возвращает pushed + lastSyncedAt', async () => {
    const order: string[] = []
    mockedPush.mockImplementation(async () => {
      order.push('push')
      return pushResult(['a', 'b'])
    })
    mockedPull.mockImplementation(async () => {
      order.push('pull')
    })

    const result = await loadEngine().sync()

    expect(order).toEqual(['push', 'pull'])
    expect(result.ok).toBe(true)
    expect(result.pushed).toBe(2)
    expect(typeof result.lastSyncedAt).toBe('string')
  })

  it('ловит ошибку и возвращает ok:false без выброса', async () => {
    mockedPush.mockRejectedValue(new Error('boom'))
    const result = await loadEngine().sync()
    expect(result).toEqual({ ok: false, error: 'boom' })
  })
})

describe('syncEngine — анти-параллель и onChange', () => {
  it('не запускает второй sync параллельно (возвращает тот же промис)', async () => {
    const engine = loadEngine()
    const first = engine.sync()
    const second = engine.sync()
    await Promise.all([first, second])
    expect(mockedPush).toHaveBeenCalledTimes(1)
  })

  it('эмитит результат подписчикам onChange', async () => {
    const engine = loadEngine()
    const listener = jest.fn()
    engine.onChange(listener)
    await engine.sync()
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })

  it('отписка прекращает уведомления', async () => {
    const engine = loadEngine()
    const listener = jest.fn()
    const unsub = engine.onChange(listener)
    unsub()
    await engine.sync()
    expect(listener).not.toHaveBeenCalled()
  })
})
