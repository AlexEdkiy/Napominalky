import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkCalendar } from './useLkCalendar'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

function makeReminder(uuid: string, remindAt: string): Reminder {
  return {
    uuid,
    title: `Напоминание ${uuid}`,
    notes: null,
    remind_at: remindAt,
    recurrence: 'none',
    is_completed: false,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function makeList(uuid: string, type: ShoppingList['type']): ShoppingList {
  return {
    uuid,
    title: 'Список',
    type,
    tags: [],
    items_count: 1,
    checked_items_count: 0,
    is_completed: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function makeItem(
  uuid: string,
  overrides: Partial<Pick<ShoppingListItem, 'deadline' | 'reminder_at'>>,
): ShoppingListItem {
  return {
    uuid,
    name: `Пункт ${uuid}`,
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    position: 1,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    tags: [],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = <T>(data: T[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

describe('useLkCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates reminders and item deadlines/reminders into byDay', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', '2026-07-10T07:00:00Z')]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList('l-1', 'goods'), makeList('l-2', 'tasks')]),
    )
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid: string) => {
      if (uuid === 'l-1') {
        return [makeItem('i-1', { deadline: '2026-07-10' })]
      }
      return [makeItem('i-2', { reminder_at: '2026-07-11T09:30:00Z' })]
    })

    const { byDay, load, error } = useLkCalendar()
    await load()

    expect(error.value).toBeNull()
    const day10 = byDay.value.get('2026-07-10') ?? []
    expect(day10).toHaveLength(2)
    expect(day10.some((event) => event.type === 'reminder' && event.time !== null)).toBe(true)
    expect(day10.some((event) => event.type === 'list' && event.time === null)).toBe(true)

    const day11 = byDay.value.get('2026-07-11') ?? []
    expect(day11).toHaveLength(1)
    expect(day11[0]?.type).toBe('task')
    expect(day11[0]?.time).not.toBeNull()
    expect(day11[0]?.route).toEqual({ name: 'lk-list-detail', params: { uuid: 'l-2' } })
  })

  it('sorts events of a day with timed events before all-day deadlines', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', '2026-07-10T18:00:00Z')]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([makeList('l-1', 'goods')]))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem('i-1', { deadline: '2026-07-10' }),
      makeItem('i-2', { reminder_at: '2026-07-10T06:00:00Z' }),
    ])

    const { byDay, load } = useLkCalendar()
    await load()

    const day = byDay.value.get('2026-07-10') ?? []
    expect(day.map((event) => event.time)).toEqual(
      [...day.map((event) => event.time)].sort((a, b) => {
        if (a !== null && b !== null) return a.localeCompare(b)
        if (a !== null) return -1
        if (b !== null) return 1
        return 0
      }),
    )
    expect(day.at(-1)?.time).toBeNull()
  })

  it('stays resilient when list item loading fails, keeping reminders', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', '2026-07-10T07:00:00Z')]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('lists down'))

    const { byDay, error, load } = useLkCalendar()
    await load()

    expect(error.value).toBeNull()
    expect(byDay.value.get('2026-07-10')).toHaveLength(1)
  })

  it('sets error only when reminders themselves fail to load', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { byDay, error, isLoading, load } = useLkCalendar()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
    expect(byDay.value.size).toBe(0)
  })

  it('prevMonth/nextMonth roll over year boundaries and goToday resets to now', () => {
    const { currentYear, currentMonth, prevMonth, nextMonth, goToday, selectedDate } = useLkCalendar()
    currentYear.value = 2026
    currentMonth.value = 0

    prevMonth()
    expect(currentYear.value).toBe(2025)
    expect(currentMonth.value).toBe(11)

    nextMonth()
    nextMonth()
    expect(currentYear.value).toBe(2026)
    expect(currentMonth.value).toBe(1)

    goToday()
    const now = new Date()
    expect(currentYear.value).toBe(now.getFullYear())
    expect(currentMonth.value).toBe(now.getMonth())
    expect(selectedDate.value.toDateString()).toBe(now.toDateString())
  })

  it('selectDay updates selectedDayEvents', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', '2026-07-10T07:00:00Z')]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { load, selectDay, selectedDayEvents } = useLkCalendar()
    await load()

    // День без событий (не завязываемся на «сегодня», иначе тест ломается,
    // когда реальная текущая дата совпадает с датой напоминания — 10 июля).
    selectDay(new Date(2026, 0, 1, 12, 0))
    expect(selectedDayEvents.value).toHaveLength(0)
    selectDay(new Date(2026, 6, 10, 12, 0))
    expect(selectedDayEvents.value).toHaveLength(1)
    expect(selectedDayEvents.value[0]?.id).toBe('reminder-r-1')
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    fetchItems: vi.fn(),
  },
}))
