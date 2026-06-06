import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import { remindersRepo, type Reminder } from '@/db/repositories/remindersRepo'
import { monthRange, ymd } from '@/utils/dateRange'

/** Группирует напоминания по дню remind_at (ключ YYYY-MM-DD). */
const groupByDay = (reminders: Reminder[]): Map<string, Reminder[]> => {
  const byDay = new Map<string, Reminder[]>()
  for (const reminder of reminders) {
    const key = ymd(new Date(reminder.remindAt))
    const bucket = byDay.get(key)
    if (bucket === undefined) byDay.set(key, [reminder])
    else bucket.push(reminder)
  }
  return byDay
}

/**
 * Активные напоминания месяца (по remind_at) + группировка по дню.
 * Источник — remindersRepo.remindersBetween на границах месяца (local-first).
 */
export function useCalendar(year: number, month: number) {
  const { startIso, endIso } = monthRange(year, month)

  const query = useQuery<Reminder[]>({
    queryKey: QueryKeys.calendar.range(startIso, endIso),
    queryFn: () => remindersRepo.remindersBetween(startIso, endIso),
  })

  const reminders = query.data ?? []
  const byDay = useMemo(() => groupByDay(reminders), [reminders])

  return { reminders, isLoading: query.isLoading, isError: query.isError, byDay }
}
