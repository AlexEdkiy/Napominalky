/**
 * Чистые функции маршрутизации deep link из уведомления (FR-27). Не зависят
 * от expo-router/expo-notifications — легко тестируются (TEST-6).
 */

/** Полезная нагрузка уведомления, ведущая на экран напоминания. */
export interface ReminderDeepLink {
  type: 'reminder'
  uuid: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Валидирует data уведомления: объект с type==='reminder' и непустым строковым
 * uuid. Возвращает типизированный объект или null, если структура не подходит.
 */
export const parseNotificationData = (data: unknown): ReminderDeepLink | null => {
  if (!isRecord(data)) return null
  if (data.type !== 'reminder') return null
  if (typeof data.uuid !== 'string' || data.uuid.length === 0) return null
  return { type: 'reminder', uuid: data.uuid }
}

/** Путь экрана деталей напоминания по uuid. */
export const reminderRoute = (uuid: string): string => `/reminders/${uuid}`
