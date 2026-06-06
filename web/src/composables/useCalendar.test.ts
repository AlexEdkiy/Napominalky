import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCalendar } from './useCalendar'
import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'
import { getCalendarDays, sameDay, ymd } from '@/utils/calendar'

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

describe('calendar date utils', () => {
  it('getCalendarDays returns a 6x7 grid starting on Monday', () => {
    // Июнь 2026: 1-е число — понедельник.
    const days = getCalendarDays(2026, 5)
    expect(days).toHaveLength(42)
    expect(days[0]?.date.getDay()).toBe(1)
    expect(days[0]?.dayOfMonth).toBe(1)
    expect(days[0]?.inCurrentMonth).toBe(true)
  })

  it('getCalendarDays pads leading days from the previous month', () => {
    // Июль 2026: 1-е число — среда → две ведущие ячейки из июня (Пн, Вт).
    const days = getCalendarDays(2026, 6)
    expect(days[0]?.inCurrentMonth).toBe(false)
    expect(days[0]?.date.getDay()).toBe(1)
    expect(days[2]?.inCurrentMonth).toBe(true)
    expect(days[2]?.dayOfMonth).toBe(1)
  })

  it('ymd formats a date as local YYYY-MM-DD', () => {
    expect(ymd(new Date(2026, 5, 3))).toBe('2026-06-03')
  })

  it('sameDay ignores time of day', () => {
    expect(sameDay(new Date(2026, 5, 3, 9), new Date(2026, 5, 3, 21))).toBe(true)
    expect(sameDay(new Date(2026, 5, 3), new Date(2026, 5, 4))).toBe(false)
  })
})

describe('useCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load fetches all reminders sorted by remind_at', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [makeReminder('r-1', '2026-06-10T07:00:00Z')],
      meta: { current_page: 1, last_page: 1, per_page: 200, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { reminders, isLoading, load } = useCalendar()
    await load()

    expect(remindersApi.fetchReminders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all', sort: 'remind_at', order: 'asc' }),
    )
    expect(reminders.value).toHaveLength(1)
    expect(isLoading.value).toBe(false)
  })

  it('byDay groups reminders by their local calendar date', async () => {
    const local = new Date(2026, 5, 10, 9, 0)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [
        makeReminder('r-1', local.toISOString()),
        makeReminder('r-2', local.toISOString()),
        makeReminder('r-3', new Date(2026, 5, 11, 8, 0).toISOString()),
      ],
      meta: { current_page: 1, last_page: 1, per_page: 200, total: 3 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { byDay, load } = useCalendar()
    await load()

    expect(byDay.value.get('2026-06-10')).toHaveLength(2)
    expect(byDay.value.get('2026-06-11')).toHaveLength(1)
  })

  it('prevMonth and nextMonth roll over year boundaries', () => {
    const { currentYear, currentMonth, prevMonth, nextMonth } = useCalendar()
    currentYear.value = 2026
    currentMonth.value = 0

    prevMonth()
    expect(currentYear.value).toBe(2025)
    expect(currentMonth.value).toBe(11)

    nextMonth()
    nextMonth()
    expect(currentYear.value).toBe(2026)
    expect(currentMonth.value).toBe(1)
  })

  it('load records an error message on failure', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))

    const { error, isLoading, load } = useCalendar()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))
