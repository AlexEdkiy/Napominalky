// Моки до импортов

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

jest.mock('@/services/notificationsBootstrap', () => ({
  rescheduleAllNotificationsOnStart: jest.fn(async () => undefined),
}))

jest.mock('@/db/repositories/remindersRepo', () => ({
  remindersRepo: {
    completeReminder: jest.fn(async () => null),
    snoozeReminder: jest.fn(async () => null),
  },
}))

import React from 'react'
import * as Notifications from 'expo-notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react-native'
import { router } from 'expo-router'
import { remindersRepo } from '@/db/repositories/remindersRepo'
import { rescheduleAllNotificationsOnStart } from '@/services/notificationsBootstrap'
import {
  REMINDER_ACTION_COMPLETE,
  REMINDER_ACTION_SNOOZE_10M,
} from '@/services/notifications'
import { handleNotificationResponse, useNotifications } from '../useNotifications'

/** Хук требует QueryClientProvider (инвалидация кэша по действиям из пуша). */
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: new QueryClient() }, children)

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
    await renderHook(() => useNotifications(), { wrapper })
    await Promise.resolve()

    expect(mockSetHandler).toHaveBeenCalledTimes(1)
  })
})

describe('useNotifications — переустановка расписания при старте', () => {
  it('вызывает rescheduleAllNotificationsOnStart один раз при монтировании', async () => {
    await renderHook(() => useNotifications(), { wrapper })
    await Promise.resolve()
    await Promise.resolve()

    expect(mockRescheduleAllOnStart).toHaveBeenCalledTimes(1)
  })

  it('не вызывает повторно при повторном рендере (тот же instance хука)', async () => {
    const { rerender } = await renderHook(() => useNotifications(), { wrapper })
    await Promise.resolve()
    rerender({})
    await Promise.resolve()

    expect(mockRescheduleAllOnStart).toHaveBeenCalledTimes(1)
  })
})

describe('useNotifications — cleanup', () => {
  it('отписывается от addNotificationResponseReceivedListener при размонтировании', async () => {
    const { unmount } = await renderHook(() => useNotifications(), { wrapper })
    await Promise.resolve()
    await unmount()

    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})

// ---- handleNotificationResponse: управляющие кнопки уведомления ------------

const actionResponse = (actionIdentifier: string, data: unknown) => ({
  actionIdentifier,
  notification: { request: { identifier: 'n-1', content: { data } } },
}) as unknown as Notifications.NotificationResponse

const mockDismiss = Notifications.dismissNotificationAsync as jest.Mock
const mockPush = router.push as jest.Mock
const mockComplete = remindersRepo.completeReminder as jest.Mock
const mockSnooze = remindersRepo.snoozeReminder as jest.Mock

describe('handleNotificationResponse — управляющие кнопки напоминания', () => {
  it('«Выполнено» вызывает completeReminder, снимает уведомление и НЕ навигирует', async () => {
    const client = new QueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    await handleNotificationResponse(
      actionResponse(REMINDER_ACTION_COMPLETE, { type: 'reminder', uuid: 'r-1' }),
      client,
    )

    expect(mockComplete).toHaveBeenCalledWith('r-1')
    expect(mockDismiss).toHaveBeenCalledWith('n-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('«Отложить на 10 мин» откладывает на now+10м, снимает уведомление и НЕ навигирует', async () => {
    const before = Date.now()
    await handleNotificationResponse(
      actionResponse(REMINDER_ACTION_SNOOZE_10M, { type: 'reminder', uuid: 'r-2' }),
      new QueryClient(),
    )

    expect(mockSnooze).toHaveBeenCalledTimes(1)
    const [uuid, snoozedUntil] = mockSnooze.mock.calls[0]
    expect(uuid).toBe('r-2')
    const delta = new Date(snoozedUntil).getTime() - before
    expect(delta).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000)
    expect(delta).toBeLessThanOrEqual(10 * 60 * 1000 + 5000)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('обычный тап по телу (DEFAULT) навигирует на экран напоминания', async () => {
    await handleNotificationResponse(
      actionResponse(Notifications.DEFAULT_ACTION_IDENTIFIER, { type: 'reminder', uuid: 'r-3' }),
      new QueryClient(),
    )

    expect(mockPush).toHaveBeenCalledWith('/reminders/r-3')
    expect(mockComplete).not.toHaveBeenCalled()
    expect(mockSnooze).not.toHaveBeenCalled()
  })

  it('кнопки чужих типов (list_item) не выполняют действий напоминания', async () => {
    await handleNotificationResponse(
      actionResponse(REMINDER_ACTION_COMPLETE, { type: 'list_item', itemUuid: 'i-1', listUuid: 'l-1' }),
      new QueryClient(),
    )

    expect(mockComplete).not.toHaveBeenCalled()
    // Фолбэк — прежняя навигация по deep link.
    expect(mockPush).toHaveBeenCalledWith('/lists/l-1')
  })
})
