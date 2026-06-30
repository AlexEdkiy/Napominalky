// Моки до импортов

jest.mock('@/services/sync/syncEngine', () => ({
  syncEngine: {
    sync: jest.fn(async () => ({ ok: true })),
  },
}))

type AppStateChangeHandler = (state: string) => void

let capturedHandler: AppStateChangeHandler | null = null
const mockRemove = jest.fn()

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_event: string, handler: AppStateChangeHandler) => {
      capturedHandler = handler
      return { remove: mockRemove }
    }),
  },
}))

import { renderHook } from '@testing-library/react-native'
import { syncEngine } from '@/services/sync/syncEngine'
import { useBackgroundSync } from '../useBackgroundSync'

const mockSync = syncEngine.sync as jest.MockedFunction<typeof syncEngine.sync>

beforeEach(() => {
  mockSync.mockClear()
  mockRemove.mockClear()
  capturedHandler = null
  const { AppState } = require('react-native')
  ;(AppState.addEventListener as jest.Mock).mockImplementation(
    (_event: string, handler: AppStateChangeHandler) => {
      capturedHandler = handler
      return { remove: mockRemove }
    },
  )
})

describe('useBackgroundSync', () => {
  it('подписывается на AppState при монтировании', async () => {
    const { AppState } = require('react-native')
    await renderHook(() => useBackgroundSync())
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('отписывается при размонтировании (subscription.remove вызывается)', async () => {
    const { unmount } = await renderHook(() => useBackgroundSync())
    await unmount()
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  it('вызывает syncEngine.sync при переходе в background', async () => {
    await renderHook(() => useBackgroundSync())
    expect(capturedHandler).not.toBeNull()
    capturedHandler!('background')
    await Promise.resolve()
    expect(mockSync).toHaveBeenCalledTimes(1)
  })

  it('НЕ вызывает sync при переходе active→active', async () => {
    await renderHook(() => useBackgroundSync())
    capturedHandler!('active')
    await Promise.resolve()
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('НЕ вызывает sync при повторном background→background', async () => {
    await renderHook(() => useBackgroundSync())
    // Первый уход в фон
    capturedHandler!('background')
    await Promise.resolve()
    mockSync.mockClear()
    // prevState теперь 'background' — не должен тригерить снова
    capturedHandler!('background')
    await Promise.resolve()
    expect(mockSync).not.toHaveBeenCalled()
  })
})
