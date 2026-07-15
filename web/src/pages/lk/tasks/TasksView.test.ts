import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import type { VueWrapper } from '@vue/test-utils'

import TasksView from './TasksView.vue'
import LkTaskFormDialog from '@/components/lk/LkTaskFormDialog.vue'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: 4,
    checked_items_count: 2,
    is_completed: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    uuid: 'i-1',
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
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginatedLists = (data: ShoppingList[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

const emptyReminders = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
  links: { first: null, last: null, prev: null, next: null },
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/tasks', name: 'lk-tasks', component: TasksView },
      { path: '/lk/calendar', name: 'lk-calendar', component: { template: '<div />' } },
    ],
  })
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

// `useLkForms`/`tasksVersion` — module-level singleton: если не размонтировать
// компоненты предыдущих тестов, их `watch(tasksVersion, ...)` продолжает
// реагировать на бампы версии из последующих тестов и многократно дёргает
// API. Отслеживаем все смонтированные обёртки и размонтируем их в `afterEach`.
const mountedWrappers: VueWrapper[] = []

async function mountTasksView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-tasks' })
  const wrapper = mount(TasksView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

// Модалка «Задача/список» рендерится один раз в `LkLayout`, а не в
// `TasksView` — для интеграционных тестов (create/edit через модалку)
// монтируем оба компонента рядом, как это делает реальный `LkLayout`.
const TasksViewWithDialog = defineComponent({
  components: { TasksView, LkTaskFormDialog },
  template: '<div><TasksView /><LkTaskFormDialog /></div>',
})

async function mountTasksViewWithDialog() {
  const router = createTestRouter()
  await router.push({ name: 'lk-tasks' })
  const wrapper = mount(TasksViewWithDialog, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

describe('TasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(emptyReminders)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
  })

  it('shows a loading state before the lists resolve', async () => {
    stubMatchMedia(true)
    let resolveLists: (() => void) | undefined
    vi.mocked(shoppingListsApi.fetchLists).mockReturnValue(
      new Promise((resolve) => {
        resolveLists = () => resolve(paginatedLists([]))
      }),
    )

    const { wrapper } = await mountTasksView()

    expect(wrapper.text()).toContain('Загрузка')
    resolveLists?.()
  })

  it('shows an error message when the API call fails', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('renders the table with the макет column headers and one row per list', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', type: 'goods', items_count: 4, checked_items_count: 2 }),
        makeList({ uuid: 'l-2', title: 'Дела', type: 'tasks', items_count: 3, checked_items_count: 1 }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.tasks-view__sort').map((th) => th.text().replace(/[↑↓]\s*$/, '').trim())).toEqual([
      'Задача',
      'Теги',
      'Дата',
      'Напоминание',
    ])
    expect(wrapper.findAll('.lk-task-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Продукты')
    // Подпись пунктов — по типу списка (как в МП): goods — «куплено», tasks — «сделано».
    expect(wrapper.text()).toContain('4 пункта · 2 куплено')
    expect(wrapper.text()).toContain('3 пункта · 1 сделано')
    // Тексты кнопок тулбара и нижней строки — как в макете.
    expect(wrapper.find('.tasks-view__create-btn').text()).toContain('Новая задача')
    expect(wrapper.find('.tasks-view__add').text()).toContain('Добавить задачу')
    // Пустые Теги/Дата/Напоминание — прочерки «—» (у списков без
    // датированных пунктов; принятое отклонение от скриншотов).
    const emptyCells = wrapper.findAll('.lk-task-row')[0]!.findAll('.lk-task-row__empty')
    expect(emptyCells.map((cell) => cell.text())).toEqual(['—', '—', '—'])
  })

  it('renders tag pills in the tags column', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([makeList({ uuid: 'l-1', tags: ['Покупки', 'Важное'] })]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-tag-pill').map((tag) => tag.text())).toEqual(['Покупки', 'Важное'])
  })

  it('shows the derived nearest item deadline and reminder once the background fetch resolves', async () => {
    stubMatchMedia(true)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00'))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({ uuid: 'l-1' })]))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', deadline: '2026-03-10', reminder_at: '2026-03-10T09:00:00' }),
    ])

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row__date').exists()).toBe(true))

    expect(wrapper.find('.lk-task-row__date').text()).toBe('Сегодня')
    expect(wrapper.find('.lk-task-row__date').classes()).toContain('lk-task-row__date--today')
    // Формат колонки НАПОМИНАНИЕ — «⏰ HH:MM», как в макете.
    expect(wrapper.find('.lk-task-row__reminder').text()).toBe('⏰ 09:00')
    vi.useRealTimers()
  })

  it('filters rows by the Все/Активные/Выполненные tabs using is_completed', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', is_completed: false }),
        makeList({ uuid: 'l-2', title: 'Аптека', is_completed: true }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const tabs = wrapper.findAll('.tasks-view__tab')
    expect(tabs.map((tab) => tab.text())).toEqual(['Все', 'Активные', 'Выполненные'])
    // Активная вкладка выделена визуально (тёмный сегмент), не только логически.
    expect(tabs[0]?.classes()).toContain('tasks-view__tab--active')
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')

    await tabs[1]?.trigger('click')
    expect(tabs[1]?.classes()).toContain('tasks-view__tab--active')
    expect(tabs[0]?.classes()).not.toContain('tasks-view__tab--active')
    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Аптека')

    await tabs[2]?.trigger('click')
    expect(wrapper.text()).toContain('Аптека')
    expect(wrapper.text()).not.toContain('Продукты')
  })

  it('filters rows by the Покупки/Задачи type segment and combines it with the status tabs (AND)', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', type: 'goods', is_completed: false }),
        makeList({ uuid: 'l-2', title: 'Ремонт', type: 'tasks', is_completed: false }),
        makeList({ uuid: 'l-3', title: 'Аптека', type: 'goods', is_completed: true }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const typeTabs = wrapper.findAll('.tasks-view__type-tab')
    expect(typeTabs.map((tab) => tab.text())).toEqual(['Все', 'Покупки', 'Задачи'])
    // По умолчанию активен сегмент «Все» — видны все три списка.
    expect(typeTabs[0]?.classes()).toContain('tasks-view__type-tab--active')
    expect(typeTabs[0]?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('.lk-task-row')).toHaveLength(3)

    await typeTabs[1]?.trigger('click')
    expect(typeTabs[1]?.classes()).toContain('tasks-view__type-tab--active')
    expect(typeTabs[0]?.classes()).not.toContain('tasks-view__type-tab--active')
    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).toContain('Аптека')
    expect(wrapper.text()).not.toContain('Ремонт')

    await typeTabs[2]?.trigger('click')
    expect(wrapper.text()).toContain('Ремонт')
    expect(wrapper.text()).not.toContain('Продукты')
    expect(wrapper.text()).not.toContain('Аптека')

    // AND-комбинация со статус-вкладками: «Активные» + «Покупки» — только активные goods.
    await typeTabs[1]?.trigger('click')
    await wrapper.findAll('.tasks-view__tab')[1]?.trigger('click')
    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Аптека')
    expect(wrapper.text()).not.toContain('Ремонт')
  })

  it('marks a completed row with the completed modifier (strike-through styling)', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([makeList({ uuid: 'l-1', is_completed: true })]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.find('.lk-task-row').classes()).toContain('lk-task-row--completed')
    expect((wrapper.find('.lk-task-row__checkbox').element as HTMLInputElement).checked).toBe(true)
  })

  it('sorts rows by title on a header click and reverses on the second click', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([makeList({ uuid: 'l-1', title: 'Продукты' }), makeList({ uuid: 'l-2', title: 'Аптека' })]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const titleHeader = wrapper.findAll('.tasks-view__sort')[0]
    await titleHeader?.trigger('click')
    expect(titleHeader?.classes()).toContain('tasks-view__sort--active')
    expect(titleHeader?.find('.tasks-view__sort-arrow').text()).toBe('↑')
    expect(wrapper.findAll('.lk-task-row__title').map((cell) => cell.text())).toEqual(['Аптека', 'Продукты'])

    await titleHeader?.trigger('click')
    // Реверс: стрелка активной колонки переворачивается вниз.
    expect(titleHeader?.find('.tasks-view__sort-arrow').text()).toBe('↓')
    expect(wrapper.findAll('.lk-task-row__title').map((cell) => cell.text())).toEqual(['Продукты', 'Аптека'])
  })

  it('toggles is_completed through the row checkbox (updateList) without opening the modal', async () => {
    stubMatchMedia(true)
    const list = makeList({ uuid: 'l-1', is_completed: false })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([list]))
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, is_completed: true })

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-task-row__checkbox').trigger('click')
    await wrapper.find('.lk-task-row__checkbox').trigger('change')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { is_completed: true }),
    )
    expect(useLkForms().isTaskFormOpen.value).toBe(false)
  })

  it('opens the task form in edit mode when a row is clicked', async () => {
    stubMatchMedia(true)
    const list = makeList({ uuid: 'l-1', title: 'Продукты' })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([list]))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-task-row').trigger('click')

    const forms = useLkForms()
    expect(forms.isTaskFormOpen.value).toBe(true)
    expect(forms.taskFormList.value).toEqual(list)
  })

  it('opens the task form in create mode via the «+ Новая задача» button and the add row', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({})]))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.tasks-view__create-btn').trigger('click')
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
    expect(useLkForms().taskFormList.value).toBeNull()

    resetLkFormsForTests()
    await wrapper.find('.tasks-view__add-row').trigger('click')
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
    expect(useLkForms().taskFormList.value).toBeNull()
  })

  it('shows the empty state with a create CTA when there are no lists at all', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([]))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Пока нет задач')
    await wrapper.find('.tasks-view__empty-cta').trigger('click')
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
  })

  it('creates a list end-to-end through the modal and reloads the table (tasksVersion bump)', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValueOnce(paginatedLists([]))
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(makeList({ uuid: 'l-9', title: 'Дача' }))

    const { wrapper } = await mountTasksViewWithDialog()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValueOnce(
      paginatedLists([makeList({ uuid: 'l-9', title: 'Дача' })]),
    )
    await wrapper.find('.tasks-view__create-btn').trigger('click')
    await wrapper.find('#task-form-title').setValue('Дача')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({ title: 'Дача', type: 'goods', tags: [] }),
    )
    await vi.waitFor(() => expect(shoppingListsApi.fetchLists).toHaveBeenCalledTimes(2))
    expect(useLkForms().isTaskFormOpen.value).toBe(false)
  })

  it('shows the right-rail on wide desktop and hides it on narrower screens', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([]))

    stubMatchMedia(true)
    const wide = await mountTasksView()
    await vi.waitFor(() => expect(wide.wrapper.text()).not.toContain('Загрузка'))
    expect(wide.wrapper.find('.lk-tasks-right-rail').exists()).toBe(true)
    vi.unstubAllGlobals()

    stubMatchMedia(false)
    const narrow = await mountTasksView()
    await vi.waitFor(() => expect(narrow.wrapper.text()).not.toContain('Загрузка'))
    expect(narrow.wrapper.find('.lk-tasks-right-rail').exists()).toBe(false)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    fetchList: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    fetchItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    checkItem: vi.fn(),
  },
}))

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))
