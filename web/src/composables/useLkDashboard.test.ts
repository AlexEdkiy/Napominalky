import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkDashboard } from './useLkDashboard'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

const TODAY = new Date(2026, 6, 6, 9, 0) // 2026-07-06 09:00 local

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

function makeList(itemsCount: number, checkedCount: number, uuid: string): ShoppingList {
  return {
    uuid,
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: itemsCount,
    checked_items_count: checkedCount,
    is_completed: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function makeItem(uuid: string, overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    uuid,
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    position: 0,
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

const paginated = <T>(data: T[], total?: number) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: total ?? data.length },
  links: { first: null, last: null, prev: null, next: null },
})

describe('useLkDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts today reminders in stats and keeps only upcoming ones for the panel', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList(5, 2, 'l-1'), makeList(3, 3, 'l-2')]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([
        makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString()),
        makeReminder('r-2', new Date(2026, 6, 7, 10, 0).toISOString()),
        makeReminder('r-3', new Date(2026, 6, 8, 10, 0).toISOString()),
      ]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 4))

    const { isLoading, error, stats, upcomingReminders, load } = useLkDashboard()
    await load()

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    // Сегодняшнее r-1 учитывается только в счётчике, панели «на сегодня» нет.
    expect(upcomingReminders.value.map((reminder) => reminder.uuid)).toEqual(['r-2', 'r-3'])
    expect(stats.value).toEqual({
      activeTasksCount: 3,
      remindersTodayCount: 1,
      notesCount: 4,
      completedWeekPercent: 63,
    })
  })

  it('exposes active (not completed) task lists for the overview «Задачи» panel', async () => {
    const completed: ShoppingList = { ...makeList(2, 2, 'l-2'), is_completed: true }
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList(5, 2, 'l-1'), completed, makeList(1, 0, 'l-3')]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { taskLists, load } = useLkDashboard()
    await load()

    expect(taskLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-3'])
  })

  it('loads derived item deadlines for active lists in the background (filter «Сделать сегодня»)', async () => {
    const completed: ShoppingList = { ...makeList(2, 2, 'l-3'), is_completed: true }
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList(5, 2, 'l-1'), makeList(3, 1, 'l-2'), completed]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid) => {
      if (uuid === 'l-1') {
        return [makeItem('i-1', { deadline: '2026-07-06' })]
      }
      return [makeItem('i-2', { deadline: '2026-07-08' })]
    })

    const { taskListDates, load } = useLkDashboard()
    await load()
    await vi.waitFor(() => expect(taskListDates.value.size).toBe(2))

    expect(taskListDates.value.get('l-1')).toEqual({ deadline: '2026-07-06', reminderAt: null })
    expect(taskListDates.value.get('l-2')).toEqual({ deadline: '2026-07-08', reminderAt: null })
    // Пункты запрашиваются только для активных списков панели «Задачи».
    expect(shoppingListsApi.fetchItems).not.toHaveBeenCalledWith('l-3')
  })

  it('keeps the overview working when the background items fetch fails', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([makeList(5, 2, 'l-1')]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(shoppingListsApi.fetchItems).mockRejectedValue(new Error('network down'))

    const { error, taskLists, taskListDates, load } = useLkDashboard()
    await load()
    await vi.waitFor(() => expect(shoppingListsApi.fetchItems).toHaveBeenCalled())

    expect(error.value).toBeNull()
    expect(taskLists.value).toHaveLength(1)
    expect(taskListDates.value.size).toBe(0)
  })

  it('records an error message on failure', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { error, isLoading, load } = useLkDashboard()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    fetchItems: vi.fn(),
  },
}))

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))
