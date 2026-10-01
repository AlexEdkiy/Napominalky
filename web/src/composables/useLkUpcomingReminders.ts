import { ref } from 'vue'

import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

/** Сколько ближайших напоминаний показывать в right-rail «Задач и списков». */
const UPCOMING_REMINDERS_LIMIT = 5

/** Сколько напоминаний запрашивать за раз (без date-range фильтра на бэке). */
const REMINDERS_PER_PAGE = 50

/**
 * API пока не фильтрует даты: читаем все pending-страницы, чтобы множество
 * просроченных на первой странице не скрывал ближайшие будущие записи.
 */
export async function fetchPendingReminders(): Promise<Reminder[]> {
  const items = new Map<string, Reminder>()
  let page = 1
  while (true) {
    const response = await remindersApi.fetchReminders({
      status: 'pending',
      sort: 'remind_at',
      order: 'asc',
      per_page: REMINDERS_PER_PAGE,
      ...(page > 1 ? { page } : {}),
    })
    for (const reminder of response.data) items.set(reminder.uuid, reminder)
    if (page >= response.meta.last_page || response.data.length === 0) break
    page += 1
  }
  return [...items.values()]
}

/** Только предстоящие, включая сегодня; ближайшие идут первыми. */
export function nearestPendingReminders(items: Reminder[], now: Date): Reminder[] {
  const current = now.getTime()
  return items
    .filter((item) => !item.is_completed && Date.parse(item.remind_at) >= current)
    .sort((a, b) => Date.parse(a.remind_at) - Date.parse(b.remind_at))
    .slice(0, UPCOMING_REMINDERS_LIMIT)
}

/** Ближайшие невыполненные напоминания для «Задач и списков» и Обзора. */
export function useLkUpcomingReminders() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const reminders = ref<Reminder[]>([])

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const items = await fetchPendingReminders()
      reminders.value = nearestPendingReminders(items, new Date())
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить напоминания'
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, reminders, load }
}
