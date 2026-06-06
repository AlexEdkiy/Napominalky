import { computed, ref } from 'vue'

import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'
import { ymd } from '@/utils/calendar'

/**
 * Сколько напоминаний запрашивать за раз для месячного вида.
 * Date-range фильтра у API нет — выбираем большой пул и группируем на клиенте.
 */
const CALENDAR_PER_PAGE = 200

/**
 * Read-only месячный вид: состояние месяца, загрузка напоминаний
 * и их группировка по дате (локальная TZ) для отрисовки сетки.
 */
export function useCalendar() {
  const now = new Date()
  const currentYear = ref(now.getFullYear())
  const currentMonth = ref(now.getMonth())

  const reminders = ref<Reminder[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Напоминания, сгруппированные по ключу даты `YYYY-MM-DD` (по `remind_at`). */
  const byDay = computed<Map<string, Reminder[]>>(() => {
    const map = new Map<string, Reminder[]>()
    for (const reminder of reminders.value) {
      const date = new Date(reminder.remind_at)
      if (Number.isNaN(date.getTime())) {
        continue
      }
      const key = ymd(date)
      const bucket = map.get(key)
      if (bucket) {
        bucket.push(reminder)
      } else {
        map.set(key, [reminder])
      }
    }
    return map
  })

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await remindersApi.fetchReminders({
        status: 'all',
        sort: 'remind_at',
        order: 'asc',
        per_page: CALENDAR_PER_PAGE,
      })
      reminders.value = response.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить напоминания'
    } finally {
      isLoading.value = false
    }
  }

  function prevMonth(): void {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value -= 1
    } else {
      currentMonth.value -= 1
    }
  }

  function nextMonth(): void {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value += 1
    } else {
      currentMonth.value += 1
    }
  }

  return {
    currentYear,
    currentMonth,
    reminders,
    isLoading,
    error,
    byDay,
    load,
    prevMonth,
    nextMonth,
  }
}
