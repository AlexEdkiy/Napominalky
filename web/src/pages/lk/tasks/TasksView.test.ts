import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import TasksView from './TasksView.vue'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: 4,
    checked_items_count: 2,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginatedLists = (data: ShoppingList[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length },
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
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: { template: '<div />' } },
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

async function mountTasksView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-tasks' })
  const wrapper = mount(TasksView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('TasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(emptyReminders)
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
    vi.unstubAllGlobals()
  })

  it('renders lists from the API', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты' }),
        makeList({ uuid: 'l-2', title: 'Аптека' }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-shopping-list-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).toContain('Аптека')
    vi.unstubAllGlobals()
  })

  it('shows the empty state with a create CTA when there are no lists at all', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([]))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Пока нет списков')
    expect(wrapper.find('.tasks-view__empty-cta').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('shows an error message when the API call fails', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
    vi.unstubAllGlobals()
  })

  it('filters the rendered lists by search query', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты' }),
        makeList({ uuid: 'l-2', title: 'Аптека' }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('input[type="search"]').setValue('апт')

    expect(wrapper.text()).toContain('Аптека')
    expect(wrapper.text()).not.toContain('Продукты')
    vi.unstubAllGlobals()
  })

  it('filters by completion status via the filter select', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', items_count: 4, checked_items_count: 2 }),
        makeList({ uuid: 'l-2', title: 'Аптека', items_count: 3, checked_items_count: 3 }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const selects = wrapper.findAll('select')
    await selects[1]?.setValue('completed')

    expect(wrapper.text()).toContain('Аптека')
    expect(wrapper.text()).not.toContain('Продукты')
    vi.unstubAllGlobals()
  })

  it('filters by list type via the type select', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', type: 'goods' }),
        makeList({ uuid: 'l-2', title: 'Дела на день', type: 'tasks' }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const selects = wrapper.findAll('select')
    await selects[2]?.setValue('tasks')

    expect(wrapper.text()).toContain('Дела на день')
    expect(wrapper.text()).not.toContain('Продукты')
    vi.unstubAllGlobals()
  })

  it('renders tag pills on cards and filters by tag once tags are present', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([
        makeList({ uuid: 'l-1', title: 'Продукты', tags: ['Покупки'] }),
        makeList({ uuid: 'l-2', title: 'Аптека', tags: ['Здоровье'] }),
      ]),
    )

    const { wrapper } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-tag-pill').map((tag) => tag.text())).toEqual(['Покупки', 'Здоровье'])

    const selects = wrapper.findAll('select')
    await selects[3]?.setValue('Здоровье')

    expect(wrapper.text()).toContain('Аптека')
    expect(wrapper.text()).not.toContain('Продукты')
    vi.unstubAllGlobals()
  })

  it('navigates to the list detail route when a card is opened', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginatedLists([makeList({ uuid: 'l-1', title: 'Продукты' })]),
    )

    const { wrapper, router } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-shopping-list-card').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-list-detail'))
    expect(router.currentRoute.value.params.uuid).toBe('l-1')
    vi.unstubAllGlobals()
  })

  it('opens the create-list dialog and navigates to the new list detail page on success', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginatedLists([]))
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(
      makeList({ uuid: 'l-9', title: 'Дача', type: 'tasks', tags: ['Дом'] }),
    )

    const { wrapper, router } = await mountTasksView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.tasks-view__create-btn').trigger('click')
    expect(wrapper.find('[aria-label="Новый список"]').exists()).toBe(true)

    await wrapper.find('#create-list-title').setValue('Дача')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({ title: 'Дача', type: 'goods', tags: [] }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-list-detail'))
    expect(router.currentRoute.value.params.uuid).toBe('l-9')
    expect(wrapper.find('[aria-label="Новый список"]').exists()).toBe(false)
    vi.unstubAllGlobals()
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
    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
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
