import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import RemindersView from './RemindersView.vue'
import { remindersApi } from '@/api/remindersApi'
import type { Reminder } from '@/types/reminder'

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    uuid: 'r-1',
    title: 'Позвонить врачу',
    notes: null,
    remind_at: '2026-07-10T18:00:00.000Z',
    recurrence: 'none',
    is_completed: false,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginatedReminders = (data: Reminder[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/reminders', name: 'lk-reminders', component: RemindersView },
      { path: '/lk/reminders/new', name: 'lk-reminder-create', component: { template: '<div />' } },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: { template: '<div />' } },
    ],
  })
}

async function mountView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-reminders' })
  const wrapper = mount(RemindersView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('RemindersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads pending reminders (per_page <= 100) on mount', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    await mountView()

    await vi.waitFor(() =>
      expect(remindersApi.fetchReminders).toHaveBeenCalledWith({
        status: 'pending',
        sort: 'remind_at',
        order: 'asc',
        per_page: 100,
      }),
    )
  })

  it('renders reminders as cards', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1', title: 'Позвонить врачу' })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-reminder-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Позвонить врачу')
  })

  it('shows the empty state with a create CTA', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Напоминаний пока нет')
    expect(wrapper.find('.reminders-view__empty-cta').exists()).toBe(true)
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('refetches with the selected status filter', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.findAll('.reminders-view__filter')[1]?.trigger('click')

    await vi.waitFor(() =>
      expect(remindersApi.fetchReminders).toHaveBeenLastCalledWith({
        status: 'completed',
        sort: 'remind_at',
        order: 'asc',
        per_page: 100,
      }),
    )
  })

  it('navigates to the edit route when a card is opened', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' })]),
    )

    const { wrapper, router } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminder-edit'))
    expect(router.currentRoute.value.params.uuid).toBe('r-1')
  })

  it('navigates to the create route from the toolbar button', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    const { wrapper, router } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminders-view__create-btn').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminder-create'))
  })

  it('completes a reminder', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' })]),
    )
    vi.mocked(remindersApi.completeReminder).mockResolvedValue(
      makeReminder({ uuid: 'r-1', is_completed: true }),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card__action--complete').trigger('click')

    await vi.waitFor(() => expect(remindersApi.completeReminder).toHaveBeenCalledWith('r-1'))
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
