import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReminders } from './useReminders'
import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

const reminder: Reminder = {
  uuid: 'r-1',
  title: 'Позвонить врачу',
  notes: 'В 10 утра',
  remind_at: '2026-06-10T07:00:00Z',
  recurrence: 'none',
  is_completed: false,
  completed_at: null,
  snoozed_until: null,
  source_uuid: null,
  source_type: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

describe('useReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates reminders from the paginated response', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [reminder],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { reminders, isLoading, load } = useReminders()
    await load({ status: 'pending', sort: 'remind_at', order: 'asc' })

    expect(remindersApi.fetchReminders).toHaveBeenCalledWith({
      status: 'pending',
      sort: 'remind_at',
      order: 'asc',
    })
    expect(reminders.value).toHaveLength(1)
    expect(reminders.value[0]?.uuid).toBe('r-1')
    expect(isLoading.value).toBe(false)
  })

  it('create prepends the new reminder', async () => {
    const created: Reminder = { ...reminder, uuid: 'r-2', title: 'Купить молоко' }
    vi.mocked(remindersApi.createReminder).mockResolvedValue(created)

    const { reminders, create } = useReminders()
    const result = await create({
      title: 'Купить молоко',
      remind_at: '2026-06-11T07:00:00Z',
    })

    expect(result?.uuid).toBe('r-2')
    expect(reminders.value[0]?.uuid).toBe('r-2')
  })

  it('remove drops the reminder from the list', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [reminder],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(remindersApi.deleteReminder).mockResolvedValue(undefined)

    const { reminders, load, remove } = useReminders()
    await load()
    const ok = await remove('r-1')

    expect(ok).toBe(true)
    expect(reminders.value).toHaveLength(0)
  })

  it('complete replaces the matching reminder in place', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [reminder],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(remindersApi.completeReminder).mockResolvedValue({
      ...reminder,
      is_completed: true,
      completed_at: '2026-06-09T08:00:00Z',
    })

    const { reminders, load, complete } = useReminders()
    await load()
    await complete('r-1')

    expect(reminders.value[0]?.is_completed).toBe(true)
  })

  it('snooze updates snoozed_until on the reminder', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue({
      data: [reminder],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(remindersApi.snoozeReminder).mockResolvedValue({
      ...reminder,
      snoozed_until: '2026-06-10T07:10:00Z',
    })

    const { reminders, load, snooze } = useReminders()
    await load()
    await snooze('r-1', '10m')

    expect(remindersApi.snoozeReminder).toHaveBeenCalledWith('r-1', '10m')
    expect(reminders.value[0]?.snoozed_until).toBe('2026-06-10T07:10:00Z')
  })

  it('load records an error message on failure', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))

    const { error, isLoading, load } = useReminders()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
    fetchReminder: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    completeReminder: vi.fn(),
    snoozeReminder: vi.fn(),
  },
}))
