import { ref } from 'vue'

import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

/** Сколько ближайших напоминаний показывать в right-rail «Задач и списков». */
const UPCOMING_REMINDERS_LIMIT = 5

/** Сколько напоминаний запрашивать за раз (без date-range фильтра на бэке). */
const REMINDERS_PER_PAGE = 50

/**
 * Ближайшие невыполненные напоминания для right-rail раздела «Задачи и
 * списки» — тот же приём, что и «Ближайшие напоминания» в `useLkDashboard`
 * (сортировка по `remind_at` по возрастанию, лимит на клиенте), но без
 * агрегатов «Обзора», которые здесь не нужны.
 */
export function useLkUpcomingReminders() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const reminders = ref<Reminder[]>([])

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await remindersApi.fetchReminders({
        status: 'pending',
        sort: 'remind_at',
        order: 'asc',
        per_page: REMINDERS_PER_PAGE,
      })
      reminders.value = response.data.slice(0, UPCOMING_REMINDERS_LIMIT)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить напоминания'
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, reminders, load }
}
