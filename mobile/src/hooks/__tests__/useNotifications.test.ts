// Моки до импортов

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

jest.mock('@/services/notificationsBootstrap', () => ({
  rescheduleAllNotificationsOnStart: jest.fn(async () => undefined),
}))

import * as Notifications from 'expo-notifications'
import { renderHook } from '@testing-library/react-native'
import { rescheduleAllNotificationsOnStart } from '@/services/notificationsBootstrap'
import { useNotifications } from '../useNotifications'

const mockRescheduleAllOnStart = rescheduleAllNotificationsOnStart as jest.Mock
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock
const mockGetLastResponse = Notifications.getLastNotificationResponseAsync as jest.Mock
const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock
const mockSetHandler = Notifications.setNotificationHandler as jest.Mock

const mockRemove = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockGetPermissions.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' })
  mockGetLastResponse.mockResolvedValue(null)
  mockAddListener.mockReturnValue({ remove: mockRemove })
})

// configureNotificationHandler — идемпотентный singleton в реальном
// src/services/notifications.ts (не мокается в этом файле): проверяем
// вызов setNotificationHandler ПЕРВЫМ тестом в файле, пока singleton ещё
// «не настроен» — иначе повторные монтирования хука в других тестах не
// вызовут его снова (см. notifications.test.ts — идемпотентность сама по
// себе покрыта отдельно на уровне сервиса).
describe('useNotifications — настройка handler при старте (должен идти первым в файле)', () => {
  it('настраивает foreground-handler ровно один раз при монтировании', async () => {
    await renderHook(() => useNotifications())
    await Promise.resolve()

    expect(mockSetHandler).toHaveBeenCalledTimes(1)
  })
})

describe('useNotifications — переустановка расписания при старте', () => {
  it('вызывает rescheduleAllNotificationsOnStart один раз при монтировании', async () => {
    await renderHook(() => useNotifications())
    await Promise.resolve()
    await Promise.resolve()

    expect(mockRescheduleAllOnStart).toHaveBeenCalledTimes(1)
  })

  it('не вызывает повторно при повторном рендере (тот же instance хука)', async () => {
    const { rerender } = await renderHook(() => useNotifications())
    await Promise.resolve()
    rerender({})
    await Promise.resolve()

    expect(mockRescheduleAllOnStart).toHaveBeenCalledTimes(1)
  })
})

describe('useNotifications — cleanup', () => {
  it('отписывается от addNotificationResponseReceivedListener при размонтировании', async () => {
    const { unmount } = await renderHook(() => useNotifications())
    await Promise.resolve()
    await unmount()

    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})
