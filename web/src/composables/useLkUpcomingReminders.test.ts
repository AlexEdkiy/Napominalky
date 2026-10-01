import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkUpcomingReminders } from './useLkUpcomingReminders'
import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

function makeReminder(uuid: string): Reminder {
  return {
    uuid,
    title: `Напоминание ${uuid}`,
    notes: null,
    remind_at: '2026-10-08T10:00:00Z',
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

const paginated = (data: Reminder[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

describe('useLkUpcomingReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('loads pending reminders sorted by remind_at ascending', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([makeReminder('r-1'), makeReminder('r-2')]))

    const { load, reminders } = useLkUpcomingReminders()
    await load()

    expect(remindersApi.fetchReminders).toHaveBeenCalledWith({
      status: 'pending',
      sort: 'remind_at',
      order: 'asc',
      per_page: 50,
    })
    expect(reminders.value.map((r) => r.uuid)).toEqual(['r-1', 'r-2'])
  })

  it('caps the list at 5 items', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated(Array.from({ length: 8 }, (_, i) => makeReminder(`r-${i}`))),
    )

    const { load, reminders } = useLkUpcomingReminders()
    await load()

    expect(reminders.value).toHaveLength(5)
  })

  it('shows only future dates including today, sorted by time with timezone offsets', async () => {
    const entries = [
      { ...makeReminder('old'), remind_at: '2026-08-27T15:00:00Z' },
      { ...makeReminder('past'), remind_at: '2026-09-29T11:00:00Z' },
      { ...makeReminder('far'), remind_at: '2026-10-06T12:30:00Z' },
      { ...makeReminder('soon'), remind_at: '2026-10-01T15:30:00+03:00' },
      { ...makeReminder('now'), remind_at: '2026-10-01T12:00:00Z' },
      { ...makeReminder('completed'), remind_at: '2026-10-01T12:01:00Z', is_completed: true },
      { ...makeReminder('invalid'), remind_at: 'invalid' },
    ]
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated(entries))
    const { load, reminders } = useLkUpcomingReminders()
    await load()
    expect(reminders.value.map(r => r.uuid)).toEqual(['now', 'soon', 'far'])
    expect(entries.map(r => r.uuid)).toEqual(['old', 'past', 'far', 'soon', 'now', 'completed', 'invalid'])
  })

  it('finds upcoming reminders beyond a full page of overdue entries before applying the limit', async () => {
    const old = Array.from({ length: 50 }, (_, n) => ({ ...makeReminder(`old-${n}`), remind_at: '2026-09-29T10:00:00Z' }))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValueOnce({
      ...paginated(old), meta: { current_page: 1, last_page: 2, per_page: 50, total: 51 },
    }).mockResolvedValueOnce({
      ...paginated([{ ...makeReminder('upcoming'), remind_at: '2026-10-01T18:00:00Z' }]),
      meta: { current_page: 2, last_page: 2, per_page: 50, total: 51 },
    })
    const { load, reminders } = useLkUpcomingReminders()
    await load()
    expect(remindersApi.fetchReminders).toHaveBeenNthCalledWith(2, {
      status: 'pending', sort: 'remind_at', order: 'asc', per_page: 50, page: 2,
    })
    expect(reminders.value.map(r => r.uuid)).toEqual(['upcoming'])
  })

  it('reports an error instead of showing an incomplete ranking when a later page fails', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValueOnce({
      ...paginated([makeReminder('old')]), meta: { current_page: 1, last_page: 2, per_page: 50, total: 51 },
    }).mockRejectedValueOnce(new Error('Page unavailable'))
    const { load, reminders, error } = useLkUpcomingReminders()
    await load()
    expect(error.value).toBe('Page unavailable')
    expect(reminders.value).toEqual([])
  })

  it('records an error message on failure', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))

    const { load, error, isLoading } = useLkUpcomingReminders()
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
