import { ref } from 'vue'

import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { fetchListsDerivedDates } from '@/composables/useLkTasksTable'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList } from '@/types/shoppingList'
import { isShoppingListCompleted } from '@/utils/shoppingList'
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
 * спискам/напоминаниям/заметкам, активные списки задач для панели «Задачи»
 * (с производными датами пунктов для фильтра «Сделать сегодня») и ближайшие
 * предстоящие напоминания.
 */
export function useLkDashboard() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const stats = ref<LkOverviewStats>(emptyStats())
  /**
   * Активные (не выполненные) списки задач/покупок для панели «Задачи»
   * Обзора — тот же источник данных, что и раздел «Задачи и списки»
   * (GET /shopping-lists), без дополнительного запроса.
   */
  const taskLists = ref<ShoppingList[]>([])
  /**
   * Производные даты пунктов активных списков (ближайшие deadline/reminder_at)
   * — тем же механизмом, что и таблица «Задачи и списки»
   * (`fetchListsDerivedDates`); нужны фильтру «Сделать сегодня» панели
   * «Задачи». Загружаются фоном и не блокируют рендер Обзора.
   */
  const taskListDates = ref<Map<string, LkListDerivedDates>>(new Map())
  const upcomingReminders = ref<Reminder[]>([])

  /**
   * Делит pending-напоминания на сегодняшние (идут в счётчик «Напоминаний
   * сегодня») и предстоящие (панель «Ближайшие напоминания», с лимитом).
   */
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

  /** Фоновая подгрузка производных дат пунктов активных списков; сбои не ломают Обзор. */
  async function loadTaskListDates(): Promise<void> {
    taskListDates.value = await fetchListsDerivedDates(taskLists.value, new Map())
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

      taskLists.value = listsResponse.data.filter((list) => !isShoppingListCompleted(list))
      upcomingReminders.value = upcoming
      stats.value = {
        activeTasksCount: totalItems - checkedItems,
        remindersTodayCount: today.length,
        notesCount: notesResponse.meta.total,
        completedWeekPercent: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      }
      void loadTaskListDates()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить данные обзора'
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    stats,
    taskLists,
    taskListDates,
    upcomingReminders,
    load,
  }
}
