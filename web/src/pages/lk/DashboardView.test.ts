import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import DashboardView from './DashboardView.vue'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { Reminder } from '@/types/reminder'

const TODAY = new Date(2026, 6, 6, 9, 0)

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

const paginated = <T>(data: T[], total?: number) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: total ?? data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk', name: 'lk-dashboard', component: DashboardView },
      { path: '/lk/tasks', name: 'lk-tasks', component: { template: '<div />' } },
    ],
  })
}

async function mountDashboard() {
  const router = createTestRouter()
  await router.push({ name: 'lk-dashboard' })
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  return wrapper
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a loading state before the data resolves', async () => {
    let resolveLists: (() => void) | undefined
    vi.mocked(shoppingListsApi.fetchLists).mockReturnValue(
      new Promise((resolve) => {
        resolveLists = () => resolve(paginated([]))
      }),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const wrapper = await mountDashboard()

    expect(wrapper.text()).toContain('Загрузка')
    resolveLists?.()
  })

  it('renders the 4 stat numbers and both reminder lists from the API', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        {
          uuid: 'l-1',
          title: 'Продукты',
          type: 'goods',
          tags: [],
          items_count: 5,
          checked_items_count: 2,
          created_at: '',
          updated_at: '',
        },
      ]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([
        makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString()),
        makeReminder('r-2', new Date(2026, 6, 8, 10, 0).toISOString()),
      ]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 4))

    const wrapper = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Активных задач')
    expect(wrapper.text()).toContain('Напоминаний сегодня')
    expect(wrapper.text()).toContain('Заметок')
    expect(wrapper.text()).toContain('Выполнено за неделю')
    expect(wrapper.text()).toContain('40%')
    expect(wrapper.text()).toContain('Напоминание r-1')
    expect(wrapper.text()).toContain('Напоминание r-2')
    expect(wrapper.text()).toContain('Все задачи')

    // Порядок по макету: 4 стат-карточки в фиксированном порядке, затем
    // «Задачи на сегодня» перед «Ближайшие напоминания».
    const statLabels = wrapper.findAll('.lk-stat-card__label').map((label) => label.text())
    expect(statLabels).toEqual(['Активных задач', 'Напоминаний сегодня', 'Заметок', 'Выполнено за неделю'])

    const panelTitles = wrapper.findAll('.dashboard__panel-title').map((title) => title.text())
    expect(panelTitles).toEqual(['Задачи на сегодня', 'Ближайшие напоминания'])

    // 4-я карточка («Выполнено за неделю») — градиентная teal, по макету.
    expect(wrapper.findAll('.lk-stat-card')[3]?.classes()).toContain('lk-stat-card--gradient')
  })

  it('shows empty states when there are no tasks or reminders today', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const wrapper = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Нет задач на сегодня')
    expect(wrapper.text()).toContain('Предстоящих напоминаний нет')
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const wrapper = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('marks a reminder as complete when its checkbox is clicked', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(remindersApi.completeReminder).mockResolvedValue(
      makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString()),
    )

    const wrapper = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')
    await vi.waitFor(() => expect(remindersApi.completeReminder).toHaveBeenCalledWith('r-1'))

    expect(wrapper.text()).toContain('Нет задач на сегодня')
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
