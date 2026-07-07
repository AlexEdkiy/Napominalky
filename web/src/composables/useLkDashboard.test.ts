import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkDashboard } from './useLkDashboard'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList } from '@/types/shoppingList'

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
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('splits reminders into today vs upcoming and aggregates stats', async () => {
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

    const { isLoading, error, stats, todaysReminders, upcomingReminders, load } = useLkDashboard()
    await load()

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(todaysReminders.value).toHaveLength(1)
    expect(todaysReminders.value[0]?.uuid).toBe('r-1')
    expect(upcomingReminders.value).toHaveLength(2)
    expect(stats.value).toEqual({
      activeTasksCount: 3,
      remindersTodayCount: 1,
      notesCount: 4,
      completedWeekPercent: 63,
    })
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

  it('completeTodayReminder removes the reminder and updates the today count', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(remindersApi.completeReminder).mockResolvedValue(
      makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString()),
    )

    const { stats, todaysReminders, load, completeTodayReminder } = useLkDashboard()
    await load()
    expect(todaysReminders.value).toHaveLength(1)

    await completeTodayReminder('r-1')

    expect(todaysReminders.value).toHaveLength(0)
    expect(stats.value.remindersTodayCount).toBe(0)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
  },
}))

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
    completeReminder: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))
