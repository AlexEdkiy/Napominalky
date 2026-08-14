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
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
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
    status: 'new',
    status_label: 'Новая',
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    comments_count: 0,
    comments: [],
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
      'Статус',
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
    // Пустые Статус (у goods статусов нет)/Теги/Дата/Напоминание — прочерки
    // «—» (у списков без датированных пунктов; принятое отклонение от скриншотов).
    const emptyCells = wrapper.findAll('.lk-task-row')[0]!.findAll('.lk-task-row__empty')
    expect(emptyCells.map((cell) => cell.text())).toEqual(['—', '—', '—', '—'])
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

  it('shows the 💬 counter in the ЗАДАЧА cell from the derived comments once loaded', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({ uuid: 'l-1' })]))
    let resolveItems: ((items: ShoppingListItem[]) => void) | undefined
    vi.mocked(shoppingListsApi.fetchItems).mockReturnValue(
      new Promise((resolve) => {
        resolveItems = resolve
      }),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row').exists()).toBe(true))

    // Пока derived не загружен — индикатор комментариев не показывается.
    expect(wrapper.find('.lk-task-row__comments').exists()).toBe(false)

    resolveItems?.([
      makeItem({
        uuid: 'i-1',
        name: 'Плитка',
        comments_count: 2,
        comments: [
          { uuid: 'c-1', author_name: 'Анна', body: 'Взять образец', created_at: '2026-03-01T10:00:00' },
          { uuid: 'c-2', author_name: 'Пётр', body: 'Уже взял', created_at: '2026-03-02T11:00:00' },
        ],
      }),
      makeItem({
        uuid: 'i-2',
        name: 'Затирка',
        comments_count: 1,
        comments: [
          { uuid: 'c-3', author_name: 'Анна', body: 'Белую', created_at: '2026-03-03T12:00:00' },
        ],
      }),
    ])
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row__comments').exists()).toBe(true))

    // Суммарный счётчик по всем пунктам списка — в ячейке ЗАДАЧА.
    const indicator = wrapper.find('.lk-task-row__comments')
    expect(indicator.text()).toContain('3')
    expect(wrapper.find('.lk-task-row__cell--task .lk-task-row__comments').exists()).toBe(true)
  })

  it('hides the 💬 counter when the list items carry no comments', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({ uuid: 'l-1' })]))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1' })])

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(shoppingListsApi.fetchItems).toHaveBeenCalled())
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-task-row__comments').exists()).toBe(false)
  })

  it('opens the hover popover grouped by items and does NOT open the row modal on click', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({ uuid: 'l-1' })]))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({
        uuid: 'i-1',
        name: 'Плитка',
        comments_count: 1,
        comments: [
          { uuid: 'c-1', author_name: 'Анна', body: 'Взять образец', created_at: '2026-03-01T10:00:00' },
        ],
      }),
      makeItem({
        uuid: 'i-2',
        name: 'Затирка',
        comments_count: 1,
        comments: [
          { uuid: 'c-2', author_name: 'Пётр', body: 'Белую', created_at: '2026-03-03T12:00:00' },
        ],
      }),
    ])

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row__comments').exists()).toBe(true))

    // Превью по focusin (hover-задержки покрыты тестами LkCommentsPopover).
    await wrapper.find('.lk-comments-popover').trigger('focusin')
    const tooltip = wrapper.find('[role="tooltip"]')
    expect(tooltip.exists()).toBe(true)
    // Содержимое сгруппировано по пунктам: имя пункта → его комментарии.
    expect(tooltip.findAll('.lk-comments-popover__group').map((group) => group.text())).toEqual([
      'Плитка',
      'Затирка',
    ])
    expect(tooltip.text()).toContain('Взять образец')
    expect(tooltip.text()).toContain('Пётр')

    // @click.stop: клик по индикатору не открывает модалку строки.
    await wrapper.find('.lk-task-row__comments').trigger('click')
    expect(useLkForms().isTaskFormOpen.value).toBe(false)
  })

  it('fixes the column layout with a colgroup so background date loading cannot shift columns', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({})]))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    // colgroup задаёт ширины колонок (вместе с table-layout: fixed) — подмена
    // «—» на значения дат не пересчитывает раскладку и не двигает соседей.
    const cols = wrapper.findAll('.tasks-view__table colgroup col')
    expect(cols).toHaveLength(5)
    expect(cols.map((col) => col.classes()[0])).toEqual([
      'tasks-view__col--title',
      'tasks-view__col--status',
      'tasks-view__col--tags',
      'tasks-view__col--date',
      'tasks-view__col--reminder',
    ])
  })

  it('swaps the «—» placeholder for the derived value inside the same cell (no reflow)', async () => {
    stubMatchMedia(true)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00'))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([makeList({ uuid: 'l-1' })]))
    let resolveItems: ((items: ShoppingListItem[]) => void) | undefined
    vi.mocked(shoppingListsApi.fetchItems).mockReturnValue(
      new Promise((resolve) => {
        resolveItems = resolve
      }),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row').exists()).toBe(true))

    // Пока пункты не подгружены — плейсхолдеры «—» в колонках ДАТА и НАПОМИНАНИЕ
    // (после ЗАДАЧА/СТАТУС/ТЕГИ это 4-я и 5-я ячейки).
    const cellsBefore = wrapper.find('.lk-task-row').findAll('td')
    expect(cellsBefore[3]?.find('.lk-task-row__empty').exists()).toBe(true)
    expect(cellsBefore[4]?.find('.lk-task-row__empty').exists()).toBe(true)

    resolveItems?.([makeItem({ deadline: '2026-03-12', reminder_at: '2026-03-12T14:00:00' })])
    await vi.waitFor(() => expect(wrapper.find('.lk-task-row__date').exists()).toBe(true))

    // Значения появляются в тех же ячейках (4-я и 5-я), заменяя плейсхолдер.
    const cellsAfter = wrapper.find('.lk-task-row').findAll('td')
    expect(cellsAfter[3]?.find('.lk-task-row__date').exists()).toBe(true)
    expect(cellsAfter[3]?.find('.lk-task-row__empty').exists()).toBe(false)
    expect(cellsAfter[4]?.find('.lk-task-row__reminder').exists()).toBe(true)
    expect(cellsAfter[4]?.find('.lk-task-row__empty').exists()).toBe(false)
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

  it('shows an interactive status badge for tasks rows and «—» for goods in the СТАТУС column', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({
          uuid: 'l-1',
          title: 'Ремонт',
          type: 'tasks',
          status: 'in_progress',
          status_label: 'В работе',
          status_is_manual: true,
        }),
        makeList({ uuid: 'l-2', title: 'Продукты', type: 'goods' }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const rows = wrapper.findAll('.lk-task-row')
    // tasks: бейдж с лейблом статуса + индикатор ручного закрепления.
    const tasksStatusCell = rows[0]!.find('.lk-task-row__cell--status')
    expect(tasksStatusCell.find('.lk-status-badge__pill--interactive').text()).toBe('В работе')
    expect(tasksStatusCell.find('.lk-task-row__status-manual').exists()).toBe(true)
    expect(tasksStatusCell.find('.lk-task-row__status-manual').attributes('title')).toBe('Задано вручную')
    // role="img": aria-label на пустом span без роли скринридеры не читают.
    expect(tasksStatusCell.find('.lk-task-row__status-manual').attributes('role')).toBe('img')

    // goods: статусов нет — прочерк, бейджа и индикатора нет.
    const goodsStatusCell = rows[1]!.find('.lk-task-row__cell--status')
    expect(goodsStatusCell.find('.lk-status-badge').exists()).toBe(false)
    expect(goodsStatusCell.find('.lk-task-row__empty').text()).toBe('—')
  })

  it('hides the manual pin when the task status is derived automatically', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([makeList({ uuid: 'l-1', type: 'tasks', status_is_manual: false })]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.find('.lk-task-row__status-manual').exists()).toBe(false)
  })

  it('changes the task status from the badge menu (PUT {status}) without opening the row modal', async () => {
    stubMatchMedia(true)
    const list = makeList({ uuid: 'l-1', type: 'tasks', status: 'new' })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([list]))
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({
      ...list,
      status: 'postponed',
      status_label: 'Отложена',
      status_is_manual: true,
    })

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
    // Клик по бейджу не открыл модалку строки.
    expect(useLkForms().isTaskFormOpen.value).toBe(false)

    await wrapper.findAll('[role="menuitemradio"]')[2]?.trigger('click')
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { status: 'postponed' }),
    )
    expect(useLkForms().isTaskFormOpen.value).toBe(false)
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-status-badge__pill--interactive').text()).toBe('Отложена'),
    )
  })

  it('resets the manual pin via the «Авто» menu item (PUT {status_is_manual:false})', async () => {
    stubMatchMedia(true)
    const list = makeList({
      uuid: 'l-1',
      type: 'tasks',
      status: 'done',
      status_label: 'Выполнена',
      status_is_manual: true,
    })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([list]))
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({
      ...list,
      status: 'new',
      status_label: 'Новая',
      status_is_manual: false,
    })

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
    await wrapper.find('.lk-status-badge__option--auto').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { status_is_manual: false }),
    )
  })

  it('sorts rows by the СТАТУС header (Новая→В работе→Отложена→Выполнена), goods «—» в конце', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', type: 'goods' }),
        makeList({ uuid: 'l-2', title: 'Отпуск', type: 'tasks', status: 'done', status_label: 'Выполнена' }),
        makeList({ uuid: 'l-3', title: 'Ремонт', type: 'tasks', status: 'in_progress', status_label: 'В работе' }),
        makeList({ uuid: 'l-4', title: 'Дача', type: 'tasks', status: 'new' }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const statusHeader = wrapper.findAll('.tasks-view__sort')[1]
    expect(statusHeader?.text()).toContain('Статус')
    await statusHeader?.trigger('click')
    expect(wrapper.findAll('.lk-task-row__title').map((cell) => cell.text())).toEqual([
      'Дача',
      'Ремонт',
      'Отпуск',
      'Продукты',
    ])

    // Реверс: порядок статусов обратный, goods (без статуса) по-прежнему в конце.
    await statusHeader?.trigger('click')
    expect(wrapper.findAll('.lk-task-row__title').map((cell) => cell.text())).toEqual([
      'Отпуск',
      'Ремонт',
      'Дача',
      'Продукты',
    ])
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
