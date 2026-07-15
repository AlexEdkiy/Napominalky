import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { VueWrapper } from '@vue/test-utils'

import DashboardView from './DashboardView.vue'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
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
      { path: '/lk/reminders', name: 'lk-reminders', component: { template: '<div />' } },
      { path: '/lk/notes', name: 'lk-notes', component: { template: '<div />' } },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: { template: '<div />' } },
    ],
  })
}

// `useLkForms`/`remindersVersion` — module-level singleton: если не
// размонтировать компоненты, их `watch(remindersVersion, ...)` продолжает
// реагировать на бампы версии из последующих тестов. Отслеживаем обёртки и
// размонтируем в `afterEach`.
const mountedWrappers: VueWrapper[] = []

async function mountDashboard() {
  const router = createTestRouter()
  await router.push({ name: 'lk-dashboard' })
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
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

    const { wrapper } = await mountDashboard()

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
          is_completed: false,
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

    const { wrapper } = await mountDashboard()
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

  it('renders the "Открыть все" link to lk-reminders in the upcoming reminders panel', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const links = wrapper.findAll('.dashboard__panel-link')
    const openAll = links.find((link) => link.text().includes('Открыть все'))
    expect(openAll).toBeDefined()
    expect(openAll?.attributes('href')).toBe('/lk/reminders')
    // Пустое состояние панели при этом сохраняется.
    expect(wrapper.text()).toContain('Предстоящих напоминаний нет')
  })

  it('shows empty states when there are no tasks or reminders today', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Нет задач на сегодня')
    expect(wrapper.text()).toContain('Предстоящих напоминаний нет')
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('opens a confirmation popup on checkbox click, without completing or navigating yet', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper, router } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')

    expect(wrapper.text()).toContain('Подтвердите выполнение задачи')
    expect(remindersApi.completeReminder).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('lk-dashboard')
  })

  it('does not complete the reminder when the confirmation popup is cancelled', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(wrapper.text()).not.toContain('Подтвердите выполнение задачи')
    expect(remindersApi.completeReminder).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Нет задач на сегодня')
  })

  it('marks a reminder as complete only after confirming with "Да" in the popup', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(remindersApi.completeReminder).mockResolvedValue(
      makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString()),
    )

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(remindersApi.completeReminder).toHaveBeenCalledWith('r-1'))
    expect(wrapper.text()).not.toContain('Подтвердите выполнение задачи')
    expect(wrapper.text()).toContain('Нет задач на сегодня')
  })

  it('opens the reminder form modal (not a route navigation) when clicking a "today" row body', async () => {
    const reminder = makeReminder('r-1', new Date(2026, 6, 6, 21, 0).toISOString())
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([reminder]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper, router } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__body').trigger('click')

    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toEqual(reminder)
    expect(router.currentRoute.value.name).toBe('lk-dashboard')
  })

  it('opens the reminder form modal when clicking an "upcoming" row body', async () => {
    const reminder = makeReminder('r-2', new Date(2026, 6, 8, 10, 0).toISOString())
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([reminder]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-item__body').trigger('click')

    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toEqual(reminder)
  })

  it('reloads the overview after a save through the reminder form modal (remindersVersion bump)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))
    vi.mocked(shoppingListsApi.fetchLists).mockClear()

    useLkForms().notifyReminderSaved()

    await vi.waitFor(() => expect(shoppingListsApi.fetchLists).toHaveBeenCalledTimes(1))
  })

  it('navigates to the stat card target route when a stat card is clicked', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper, router } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cards = wrapper.findAll('.lk-stat-card')
    // «Выполнено за неделю» (4-я карточка) остаётся статичной — не кликабельна.
    expect(cards[3]?.classes()).not.toContain('lk-stat-card--clickable')

    await cards[0]?.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
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
