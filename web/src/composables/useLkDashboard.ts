import { ref } from 'vue'

import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'
import { ymd } from '@/utils/calendar'

/** Сколько предстоящих (не сегодняшних) напоминаний показывать в «Обзоре». */
const UPCOMING_REMINDERS_LIMIT = 5

/** Сколько напоминаний запрашивать за раз (без date-range фильтра на бэке). */
const REMINDERS_PER_PAGE = 50

/** Сколько списков покупок запрашивать для агрегатов «Обзора». */
const LISTS_PER_PAGE = 100

/**
 * Статистика раздела «Обзор». `completedWeekPercent` — приближение
 * (доля выполненных пунктов списков покупок из доступных данных), так как
 * отдельного агрегата «выполнено за неделю» в API нет.
 */
export interface LkOverviewStats {
  activeTasksCount: number
  remindersTodayCount: number
  notesCount: number
  completedWeekPercent: number
}

function emptyStats(): LkOverviewStats {
  return { activeTasksCount: 0, remindersTodayCount: 0, notesCount: 0, completedWeekPercent: 0 }
}

/**
 * Инкапсулирует данные раздела «Обзор» (`DashboardView`): агрегаты по
 * спискам/напоминаниям/заметкам, напоминания на сегодня («Задачи на
 * сегодня» — отмечаются выполненными) и ближайшие предстоящие напоминания.
 */
export function useLkDashboard() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const stats = ref<LkOverviewStats>(emptyStats())
  const todaysReminders = ref<Reminder[]>([])
  const upcomingReminders = ref<Reminder[]>([])
  /** UUID напоминания, ожидающего подтверждения выполнения (попап «Да/Отмена»). */
  const pendingCompleteUuid = ref<string | null>(null)

  function splitByToday(reminders: Reminder[]): { today: Reminder[]; upcoming: Reminder[] } {
    const todayKey = ymd(new Date())
    const today: Reminder[] = []
    const upcoming: Reminder[] = []
    for (const reminder of reminders) {
      const remindDate = new Date(reminder.remind_at)
      if (!Number.isNaN(remindDate.getTime()) && ymd(remindDate) === todayKey) {
        today.push(reminder)
      } else {
        upcoming.push(reminder)
      }
    }
    return { today, upcoming: upcoming.slice(0, UPCOMING_REMINDERS_LIMIT) }
  }

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const [listsResponse, remindersResponse, notesResponse] = await Promise.all([
        shoppingListsApi.fetchLists({ per_page: LISTS_PER_PAGE }),
        remindersApi.fetchReminders({
          status: 'pending',
          sort: 'remind_at',
          order: 'asc',
          per_page: REMINDERS_PER_PAGE,
        }),
        notesApi.fetchNotes({ per_page: 1 }),
      ])

      const totalItems = listsResponse.data.reduce((sum, list) => sum + list.items_count, 0)
      const checkedItems = listsResponse.data.reduce(
        (sum, list) => sum + list.checked_items_count,
        0,
      )
      const { today, upcoming } = splitByToday(remindersResponse.data)

      todaysReminders.value = today
      upcomingReminders.value = upcoming
      stats.value = {
        activeTasksCount: totalItems - checkedItems,
        remindersTodayCount: today.length,
        notesCount: notesResponse.meta.total,
        completedWeekPercent: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить данные обзора'
    } finally {
      isLoading.value = false
    }
  }

  async function completeTodayReminder(uuid: string): Promise<void> {
    try {
      await remindersApi.completeReminder(uuid)
      todaysReminders.value = todaysReminders.value.filter((reminder) => reminder.uuid !== uuid)
      stats.value.remindersTodayCount = todaysReminders.value.length
    } catch {
      // Оставляем элемент в списке — пользователь может повторить попытку.
    }
  }

  /** Открывает попап подтверждения выполнения для напоминания с данным uuid. */
  function requestComplete(uuid: string): void {
    pendingCompleteUuid.value = uuid
  }

  /** Подтверждение из попапа («Да») — фактически завершает напоминание. */
  async function confirmComplete(): Promise<void> {
    const uuid = pendingCompleteUuid.value
    pendingCompleteUuid.value = null
    if (uuid !== null) {
      await completeTodayReminder(uuid)
    }
  }

  /** Отмена из попапа («Отмена»/Esc/клик вне) — закрывает его без изменений. */
  function cancelComplete(): void {
    pendingCompleteUuid.value = null
  }

  return {
    isLoading,
    error,
    stats,
    todaysReminders,
    upcomingReminders,
    pendingCompleteUuid,
    load,
    completeTodayReminder,
    requestComplete,
    confirmComplete,
    cancelComplete,
  }
}
