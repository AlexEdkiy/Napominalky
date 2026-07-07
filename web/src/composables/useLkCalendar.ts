import { computed, ref } from 'vue'

import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'
import type { LkCalendarEvent } from '@/types/lkCalendar'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'
import { ymd } from '@/utils/calendar'

/**
 * Сколько напоминаний запрашивать за раз для месячного вида (без date-range у API).
 * 100 — максимум, разрешённый валидацией API (IndexReminderRequest: per_page max:100).
 */
const CALENDAR_REMINDERS_PER_PAGE = 100
/** Сколько списков покупок запрашивать для агрегации дедлайнов/напоминаний пунктов. */
const CALENDAR_LISTS_PER_PAGE = 100

function toTimeLabel(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function reminderToEvent(reminder: Reminder): LkCalendarEvent | null {
  const date = new Date(reminder.remind_at)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return {
    id: `reminder-${reminder.uuid}`,
    title: reminder.title,
    dateKey: ymd(date),
    time: toTimeLabel(date),
    type: 'reminder',
    route: { name: 'lk-reminder-edit', params: { uuid: reminder.uuid } },
  }
}

/**
 * Строит события пункта списка: `reminder_at` (точное время) и/или
 * `deadline` (дата без времени — «весь день») — независимые записи, если
 * заданы оба поля. Тип события — по типу родительского списка
 * (`goods` → `list`, `tasks` → `task`), клик всегда ведёт на детали списка
 * (у API нет отдельной страницы пункта).
 */
function itemToEvents(item: ShoppingListItem, list: ShoppingList): LkCalendarEvent[] {
  const type = list.type === 'tasks' ? 'task' : 'list'
  const route = { name: 'lk-list-detail', params: { uuid: list.uuid } }
  const events: LkCalendarEvent[] = []

  if (item.reminder_at !== null) {
    const date = new Date(item.reminder_at)
    if (!Number.isNaN(date.getTime())) {
      events.push({
        id: `item-${item.uuid}-reminder`,
        title: item.name,
        dateKey: ymd(date),
        time: toTimeLabel(date),
        type,
        route,
      })
    }
  }

  if (item.deadline !== null) {
    const date = new Date(item.deadline)
    if (!Number.isNaN(date.getTime())) {
      events.push({
        id: `item-${item.uuid}-deadline`,
        title: item.name,
        dateKey: ymd(date),
        time: null,
        type,
        route,
      })
    }
  }

  return events
}

/** Сортирует события дня: сперва с точным временем (по возрастанию), затем дедлайны «весь день». */
function sortDayEvents(events: LkCalendarEvent[]): LkCalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.time !== null && b.time !== null) {
      return a.time.localeCompare(b.time)
    }
    if (a.time !== null) {
      return -1
    }
    if (b.time !== null) {
      return 1
    }
    return a.title.localeCompare(b.title, 'ru')
  })
}

/**
 * Раздел «Календарь» ЛК: агрегирует в единый `byDay` события из напоминаний
 * (`remind_at`) и дедлайнов/напоминаний пунктов списков покупок
 * (`deadline`/`reminder_at`) — см. `types/lkCalendar.ts#LkCalendarEvent`.
 *
 * Date-range фильтра у API нет — тянем пул напоминаний и пункты списков
 * целиком, группируем/сортируем на клиенте (тот же приём, что в исходном
 * `useCalendar`, который продолжает обслуживать мини-календарь right-rail
 * «Задач и списков» отдельно от этого композабла).
 *
 * Устойчивость: пункты списков — второстепенный источник. Если их загрузка
 * упала (сеть/один из списков), календарь всё равно показывает напоминания;
 * `error` выставляется только если упала загрузка самих напоминаний.
 */
export function useLkCalendar() {
  const now = new Date()
  const currentYear = ref(now.getFullYear())
  const currentMonth = ref(now.getMonth())
  const selectedDate = ref<Date>(now)

  const events = ref<LkCalendarEvent[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const byDay = computed<Map<string, LkCalendarEvent[]>>(() => {
    const map = new Map<string, LkCalendarEvent[]>()
    for (const event of events.value) {
      const bucket = map.get(event.dateKey)
      if (bucket) {
        bucket.push(event)
      } else {
        map.set(event.dateKey, [event])
      }
    }
    for (const [key, bucket] of map) {
      map.set(key, sortDayEvents(bucket))
    }
    return map
  })

  const selectedDayEvents = computed<LkCalendarEvent[]>(
    () => byDay.value.get(ymd(selectedDate.value)) ?? [],
  )

  async function loadReminderEvents(): Promise<LkCalendarEvent[]> {
    const response = await remindersApi.fetchReminders({
      status: 'all',
      sort: 'remind_at',
      order: 'asc',
      per_page: CALENDAR_REMINDERS_PER_PAGE,
    })
    return response.data
      .map(reminderToEvent)
      .filter((event): event is LkCalendarEvent => event !== null)
  }

  async function loadListItemEvents(): Promise<LkCalendarEvent[]> {
    const listsResponse = await shoppingListsApi.fetchLists({ per_page: CALENDAR_LISTS_PER_PAGE })
    const itemsByList = await Promise.all(
      listsResponse.data.map((list) => shoppingListsApi.fetchItems(list.uuid)),
    )
    const result: LkCalendarEvent[] = []
    listsResponse.data.forEach((list, index) => {
      for (const item of itemsByList[index] ?? []) {
        result.push(...itemToEvents(item, list))
      }
    })
    return result
  }

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null

    let reminderEvents: LkCalendarEvent[]
    try {
      reminderEvents = await loadReminderEvents()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить напоминания'
      events.value = []
      isLoading.value = false
      return
    }

    let listEvents: LkCalendarEvent[] = []
    try {
      listEvents = await loadListItemEvents()
    } catch {
      // Пункты списков — второстепенный источник: показываем хотя бы
      // напоминания, календарь не рушим.
      listEvents = []
    }

    events.value = [...reminderEvents, ...listEvents]
    isLoading.value = false
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

  function goToday(): void {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth()
    selectedDate.value = today
  }

  function selectDay(date: Date): void {
    selectedDate.value = date
  }

  return {
    currentYear,
    currentMonth,
    selectedDate,
    selectedDayEvents,
    isLoading,
    error,
    byDay,
    load,
    prevMonth,
    nextMonth,
    goToday,
    selectDay,
  }
}
