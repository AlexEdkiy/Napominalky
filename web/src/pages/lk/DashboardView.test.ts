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
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

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

function makeShoppingList(uuid: string, overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    uuid,
    title: `Список ${uuid}`,
    type: 'goods',
    tags: [],
    items_count: 3,
    checked_items_count: 1,
    is_completed: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
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
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
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

  it('renders the 4 stat numbers and the upcoming reminders from the API', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeShoppingList('l-1', { title: 'Продукты', items_count: 5, checked_items_count: 2 }),
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
    // Сегодняшнее r-1 учитывается только в счётчике «Напоминаний сегодня»;
    // в панели «Ближайшие напоминания» — только предстоящее r-2.
    expect(wrapper.text()).not.toContain('Напоминание r-1')
    expect(wrapper.text()).toContain('Напоминание r-2')

    // Порядок по макету: 4 стат-карточки в фиксированном порядке.
    const statLabels = wrapper.findAll('.lk-stat-card__label').map((label) => label.text())
    expect(statLabels).toEqual(['Активных задач', 'Напоминаний сегодня', 'Заметок', 'Выполнено за неделю'])

    // 4-я карточка («Выполнено за неделю») — градиентная teal, по макету.
    expect(wrapper.findAll('.lk-stat-card')[3]?.classes()).toContain('lk-stat-card--gradient')
  })

  it('renders two columns under the stats: «Задачи» | «Ближайшие напоминания», without «Задачи на сегодня»', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeShoppingList('l-1', { title: 'Продукты' })]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-2', new Date(2026, 6, 8, 10, 0).toISOString())]),
    )
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const columns = wrapper.find('.dashboard__columns')
    expect(columns.exists()).toBe(true)
    // Левая колонка — панель «Задачи», правая — «Ближайшие напоминания».
    expect(columns.find('.lk-overview-tasks').exists()).toBe(true)
    const panelTitles = columns.findAll('.dashboard__panel-title').map((title) => title.text())
    expect(panelTitles).toEqual(['Ближайшие напоминания'])

    // Блок «Задачи на сегодня» (напоминания с чекбоксом) удалён полностью.
    expect(wrapper.text()).not.toContain('Задачи на сегодня')
    expect(wrapper.text()).not.toContain('Все напоминания')
    expect(wrapper.find('.lk-reminder-item__checkbox').exists()).toBe(false)
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

  it('shows empty states when there are no tasks or upcoming reminders', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Пока нет задач')
    expect(wrapper.text()).toContain('Предстоящих напоминаний нет')
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('opens the reminder form modal when clicking an "upcoming" row body', async () => {
    const reminder = makeReminder('r-2', new Date(2026, 6, 8, 10, 0).toISOString())
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

  it('renders the «Задачи» panel with active lists only (completed excluded, no link when all fit)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeShoppingList('l-1', { title: 'Купить продукты' }),
        makeShoppingList('l-2', { title: 'Старый список', is_completed: true }),
      ]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const panel = wrapper.find('.lk-overview-tasks')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('Купить продукты')
    expect(panel.text()).not.toContain('Старый список')
    // Все элементы влезли в видимую область — ссылки «Все задачи» в панели нет.
    expect(panel.find('.lk-overview-tasks__link').exists()).toBe(false)
  })

  it('shows «Все задачи» in the tasks panel only on overflow and navigates to lk-tasks', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated(Array.from({ length: 10 }, (_, index) => makeShoppingList(`l-${index + 1}`))),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper, router } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    // jsdom: innerHeight 768 → максимум 8 видимых строк, 10 списков → переполнение.
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(8)
    const link = wrapper.find('.lk-overview-tasks__link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/lk/tasks')

    await link.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
  })

  it('filters the tasks panel to today-only via the «Сделать сегодня» chip (derived item deadlines)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeShoppingList('l-1', { title: 'Сегодняшние дела' }),
        makeShoppingList('l-2', { title: 'Дела на послезавтра' }),
      ]),
    )
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid) => {
      if (uuid === 'l-1') {
        return [makeItem('i-1', { deadline: '2026-07-06' })]
      }
      return [makeItem('i-2', { deadline: '2026-07-08' })]
    })

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))
    await vi.waitFor(() => expect(shoppingListsApi.fetchItems).toHaveBeenCalledTimes(2))

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(2)

    await wrapper.find('.lk-overview-tasks__filter').trigger('click')

    const rows = wrapper.findAll('.lk-overview-tasks__item')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('Сегодняшние дела')
  })

  it('opens the task form modal (not a route navigation) when clicking a tasks panel row', async () => {
    const taskList = makeShoppingList('l-1', { title: 'Продукты' })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([taskList]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper, router } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-overview-tasks__body').trigger('click')

    const forms = useLkForms()
    expect(forms.isTaskFormOpen.value).toBe(true)
    expect(forms.taskFormList.value).toEqual(taskList)
    expect(router.currentRoute.value.name).toBe('lk-dashboard')
  })

  it('reloads the overview after a save through the task form modal (tasksVersion bump)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([], 0))

    const { wrapper } = await mountDashboard()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))
    vi.mocked(shoppingListsApi.fetchLists).mockClear()

    useLkForms().notifyTaskSaved()

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
