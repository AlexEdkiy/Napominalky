import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import CalendarView from './CalendarView.vue'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'

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

const paginated = <T>(data: T[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 200, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/calendar', name: 'lk-calendar', component: CalendarView },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: { template: '<div />' } },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: { template: '<div />' } },
    ],
  })
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

async function mountCalendarView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-calendar' })
  const wrapper = mount(CalendarView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 6, 9, 0))
  })

  it('shows a loading state before the reminders resolve', async () => {
    stubMatchMedia(true)
    let resolveReminders: (() => void) | undefined
    vi.mocked(remindersApi.fetchReminders).mockReturnValue(
      new Promise((resolve) => {
        resolveReminders = () => resolve(paginated([]))
      }),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()

    expect(wrapper.text()).toContain('Загрузка')
    resolveReminders?.()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows an error message with a retry button when reminders fail to load', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))

    expect(wrapper.find('.calendar-view__retry-btn').exists()).toBe(true)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the empty state in the day panel when there are no events', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('На этот день ничего не запланировано.')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the legend and the current month label', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-calendar-legend__item')).toHaveLength(3)
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июль 2026')
  })

  it('navigates months with prev/next and returns to today', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('[aria-label="Следующий месяц"]').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Август 2026')

    await wrapper.find('[aria-label="Предыдущий месяц"]').trigger('click')
    await wrapper.find('[aria-label="Предыдущий месяц"]').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июнь 2026')

    await wrapper.find('.calendar-view__today-btn').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июль 2026')
  })

  it('selecting a day updates the day panel events', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 15, 14, 0).toISOString())]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cells = wrapper.findAll('.lk-calendar-grid__cell')
    const target = cells.find((cell) => cell.text().startsWith('15'))
    await target?.trigger('click')

    expect(wrapper.text()).toContain('Напоминание r-1')
    expect(wrapper.text()).toContain('14:00')
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
