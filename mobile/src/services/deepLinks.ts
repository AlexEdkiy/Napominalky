/**
 * Чистые функции маршрутизации deep link из уведомления (FR-27). Не зависят
 * от expo-router/expo-notifications — легко тестируются (TEST-6).
 */

/** Полезная нагрузка уведомления, ведущая на экран напоминания. */
export interface ReminderDeepLink {
  type: 'reminder'
  uuid: string
}

/** Полезная нагрузка уведомления пункта списка покупок. */
export interface ListItemDeepLink {
  type: 'list_item'
  itemUuid: string
  listUuid: string
}

/** Объединённый тип deep link из уведомления. */
export type NotificationDeepLink = ReminderDeepLink | ListItemDeepLink

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Валидирует data уведомления: распознаёт type==='reminder' и type==='list_item'.
 * Возвращает типизированный объект или null, если структура не подходит.
 */
export const parseNotificationData = (data: unknown): NotificationDeepLink | null => {
  if (!isRecord(data)) return null

  if (data.type === 'reminder') {
    if (!isNonEmptyString(data.uuid)) return null
    return { type: 'reminder', uuid: data.uuid }
  }

  if (data.type === 'list_item') {
    if (!isNonEmptyString(data.itemUuid)) return null
    if (!isNonEmptyString(data.listUuid)) return null
    return { type: 'list_item', itemUuid: data.itemUuid, listUuid: data.listUuid }
  }

  return null
}

/** Путь экрана деталей напоминания по uuid. */
export const reminderRoute = (uuid: string): string => `/reminders/${uuid}`

/** Путь экрана деталей списка покупок по uuid. */
export const listRoute = (listUuid: string): string => `/lists/${listUuid}`
