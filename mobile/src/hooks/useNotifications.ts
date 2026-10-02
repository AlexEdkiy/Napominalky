import { useEffect, useRef, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { router, type Href } from 'expo-router'

import { QueryKeys } from '@/constants/QueryKeys'
import { remindersRepo } from '@/db/repositories/remindersRepo'
import {
  configureNotificationHandler,
  ensureAndroidNotificationChannel,
  ensureReminderNotificationCategory,
  REMINDER_ACTION_COMPLETE,
  REMINDER_ACTION_SNOOZE_10M,
} from '@/services/notifications'
import { reconcileNotificationSettings } from '@/services/notificationsBootstrap'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  listRoute,
  parseNotificationData,
  reminderRoute,
} from '@/services/deepLinks'

/** Отсрочка кнопки «Отложить на 10 мин» в уведомлении. */
const SNOOZE_ACTION_MS = 10 * 60 * 1000

interface UseNotificationsResult {
  granted: boolean
}

/** data уведомления лежит в request.content.data ответа пользователя. */
const responseData = (response: Notifications.NotificationResponse): unknown =>
  response.notification.request.content.data

/** Парсит ответ и переходит на нужный экран по типу deep link. */
const navigateFromResponse = (
  response: Notifications.NotificationResponse | null,
): void => {
  if (response === null) return
  const link = parseNotificationData(responseData(response))
  if (link === null) return

  if (link.type === 'reminder') {
    router.push(reminderRoute(link.uuid) as Href)
    return
  }

  if (link.type === 'list_item') {
    router.push(listRoute(link.listUuid) as Href)
  }
}

/**
 * Обрабатывает ответ на уведомление. Управляющие кнопки уведомления
 * напоминания («Выполнено» / «Отложить на 10 мин») выполняют действие без
 * навигации: репозиторий сам отменяет/перепланирует локальное уведомление,
 * после — инвалидация кэша напоминаний и снятие уведомления из шторки.
 * Обычный тап по телу (DEFAULT_ACTION_IDENTIFIER) — прежняя навигация.
 */
export const handleNotificationResponse = async (
  response: Notifications.NotificationResponse | null,
  queryClient: QueryClient,
): Promise<void> => {
  if (response === null) return
  const link = parseNotificationData(responseData(response))

  if (link?.type === 'reminder' && response.actionIdentifier === REMINDER_ACTION_COMPLETE) {
    await remindersRepo.completeReminder(link.uuid)
    await dismissAndInvalidate(response, queryClient)
    return
  }

  if (link?.type === 'reminder' && response.actionIdentifier === REMINDER_ACTION_SNOOZE_10M) {
    const snoozedUntil = new Date(Date.now() + SNOOZE_ACTION_MS).toISOString()
    await remindersRepo.snoozeReminder(link.uuid, snoozedUntil)
    await dismissAndInvalidate(response, queryClient)
    return
  }

  navigateFromResponse(response)
}

/** Убирает сработавшее уведомление из шторки и обновляет кэш напоминаний. */
const dismissAndInvalidate = async (
  response: Notifications.NotificationResponse,
  queryClient: QueryClient,
): Promise<void> => {
  try {
    await Notifications.dismissNotificationAsync(response.notification.request.identifier)
  } catch {
    // Уведомление могло быть уже закрыто пользователем/системой.
  }
  await queryClient.invalidateQueries({ queryKey: QueryKeys.reminders.all })
}

/**
 * Корневой хук уведомлений (FR-27): настраивает foreground-handler, Android-канал,
 * категорию с управляющими кнопками, запрашивает разрешения, переустанавливает
 * расписание будущих напоминаний и обрабатывает ответы на уведомления: тап по
 * телу — навигация, кнопки «Выполнено»/«Отложить на 10 мин» — действие без
 * открытия приложения. «Холодный старт» — через getLastNotificationResponseAsync,
 * при работающем приложении — через подписку (с cleanup).
 */
export const useNotifications = (): UseNotificationsResult => {
  const [granted, setGranted] = useState(false)
  const coldStartHandled = useRef(false)
  const queryClient = useQueryClient()
  const ready = useSettingsStore((s) => s.isHydrated)
  const enabled = useSettingsStore((s) => s.notificationsEnabled)

  useEffect(() => {
    if (!ready) return
    let active = true
    void reconcileNotificationSettings().then(() => {
      if (active) setGranted(useSettingsStore.getState().notificationsEnabled)
    }).catch(() => {
      useSettingsStore.setState({ notificationsError: 'Не удалось обновить уведомления. Повторите попытку.' })
    })
    return () => { active = false }
  }, [ready, enabled])

  useEffect(() => {
    configureNotificationHandler()
    void ensureAndroidNotificationChannel()
    void ensureReminderNotificationCategory()

    if (!coldStartHandled.current) {
      coldStartHandled.current = true
      void Notifications.getLastNotificationResponseAsync().then((response) =>
        handleNotificationResponse(response, queryClient),
      )
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => void handleNotificationResponse(response, queryClient),
    )

    return () => {
      subscription.remove()
    }
  }, [queryClient])

  return { granted }
}
