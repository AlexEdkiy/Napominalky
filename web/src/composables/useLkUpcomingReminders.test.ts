import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkUpcomingReminders } from './useLkUpcomingReminders'
import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

function makeReminder(uuid: string): Reminder {
  return {
    uuid,
    title: `Напоминание ${uuid}`,
    notes: null,
    remind_at: '2026-07-08T10:00:00Z',
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
  })

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
