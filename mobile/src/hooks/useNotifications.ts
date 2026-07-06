import { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { router, type Href } from 'expo-router'

import {
  configureNotificationHandler,
  ensureAndroidNotificationChannel,
} from '@/services/notifications'
import { rescheduleAllNotificationsOnStart } from '@/services/notificationsBootstrap'
import {
  listRoute,
  parseNotificationData,
  reminderRoute,
} from '@/services/deepLinks'

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

/** Запрашивает разрешения, повторно не дёргая системный диалог, если уже granted. */
const ensurePermissions = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

/**
 * Корневой хук уведомлений (FR-27): настраивает foreground-handler, Android-канал,
 * запрашивает разрешения, переустанавливает расписание будущих напоминаний и
 * навигирует по тапу на уведомление. Обрабатывает «холодный старт» (приложение
 * открыто тапом) через getLastNotificationResponseAsync, а тапы при работающем
 * приложении — через подписку (с cleanup).
 */
export const useNotifications = (): UseNotificationsResult => {
  const [granted, setGranted] = useState(false)
  const coldStartHandled = useRef(false)

  useEffect(() => {
    let active = true
    configureNotificationHandler()
    void ensureAndroidNotificationChannel()

    void ensurePermissions().then((value) => {
      if (active) setGranted(value)
    })

    if (!coldStartHandled.current) {
      coldStartHandled.current = true
      void Notifications.getLastNotificationResponseAsync().then(
        navigateFromResponse,
      )
      void rescheduleAllNotificationsOnStart()
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      navigateFromResponse,
    )

    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return { granted }
}
