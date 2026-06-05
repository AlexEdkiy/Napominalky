import * as Notifications from 'expo-notifications'
import { SchedulableTriggerInputTypes } from 'expo-notifications'

/**
 * Минимальный набор полей напоминания, нужный для планирования локального
 * уведомления. snoozed_until имеет приоритет над remind_at (если задан).
 */
export interface SchedulableReminder {
  uuid: string
  title: string
  notes?: string | null
  remind_at: string
  snoozed_until?: string | null
}

/** Полезная нагрузка уведомления для deep link (MOB-12). */
interface ReminderNotificationData {
  type: 'reminder'
  uuid: string
  [key: string]: unknown
}

let handlerConfigured = false

/**
 * Настраивает поведение уведомлений в foreground (баннер + список + sound).
 * Идемпотентно: повторные вызовы игнорируются. Вызывается один раз при старте
 * приложения. SDK 53+: shouldShowAlert заменён на shouldShowBanner + shouldShowList.
 */
export const configureNotificationHandler = (): void => {
  if (handlerConfigured) return
  handlerConfigured = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

/** Дата срабатывания: snoozed_until приоритетнее remind_at. */
const triggerDateIso = (reminder: SchedulableReminder): string =>
  reminder.snoozed_until ?? reminder.remind_at

/**
 * Планирует локальное уведомление на дату срабатывания. Прошедшие даты
 * (<= now) не ставятся в очередь — возвращает null. Иначе возвращает
 * identifier запланированного уведомления.
 */
export const scheduleReminder = async (
  reminder: SchedulableReminder,
): Promise<string | null> => {
  const dateIso = triggerDateIso(reminder)
  const date = new Date(dateIso)
  if (date.getTime() <= Date.now()) return null

  const data: ReminderNotificationData = { type: 'reminder', uuid: reminder.uuid }
  return Notifications.scheduleNotificationAsync({
    content: { title: reminder.title, body: reminder.notes ?? '', data },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date },
  })
}

/**
 * Отменяет запланированное уведомление по id. Безопасно к id, который уже
 * сработал/отсутствует (ошибка проглатывается).
 */
export const cancelReminder = async (
  notificationId: string | null,
): Promise<void> => {
  if (notificationId === null) return
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch {
    // id мог уже сработать или быть отменённым — это не ошибка.
  }
}

/**
 * Перепланирует уведомление: отменяет старое (если было) и планирует новое.
 * Возвращает identifier нового уведомления или null (прошедшая дата).
 */
export const rescheduleReminder = async (
  reminder: SchedulableReminder,
  oldNotificationId: string | null,
): Promise<string | null> => {
  await cancelReminder(oldNotificationId)
  return scheduleReminder(reminder)
}
