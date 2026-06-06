import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar'

const HOUR_MS = 60 * 60 * 1000

interface ReminderExport {
  title: string
  notes?: string | null
  remind_at: string
}

/** Запрашивает разрешение на доступ к календарю. Возвращает признак выдачи. */
export const requestCalendarPermissions = async (): Promise<boolean> => {
  const { granted } = await Calendar.requestCalendarPermissionsAsync()
  return granted
}

/**
 * Находит доступный для записи календарь. На iOS — системный по умолчанию,
 * на Android — первый изменяемый (или основной) из календарей событий.
 */
export const getDefaultCalendarId = async (): Promise<string | null> => {
  if (Platform.OS === 'ios') {
    const calendar = await Calendar.getDefaultCalendarAsync()
    return calendar?.id ?? null
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const writable = calendars.find((c) => c.allowsModifications || c.isPrimary)
  return writable?.id ?? null
}

/**
 * Экспортирует напоминание в системный календарь устройства. При отсутствии
 * разрешения, доступного календаря или ошибке возвращает null (не падает).
 */
export const exportReminderToCalendar = async (
  reminder: ReminderExport,
): Promise<string | null> => {
  try {
    const allowed = await requestCalendarPermissions()
    if (!allowed) return null

    const calendarId = await getDefaultCalendarId()
    if (!calendarId) return null

    const startDate = new Date(reminder.remind_at)
    const endDate = new Date(startDate.getTime() + HOUR_MS)

    const details: Omit<Partial<Calendar.Event>, 'id' | 'organizer'> = {
      title: reminder.title,
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: 0 }],
    }
    if (reminder.notes) details.notes = reminder.notes

    return await Calendar.createEventAsync(calendarId, details)
  } catch {
    return null
  }
}
